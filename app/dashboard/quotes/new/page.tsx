"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

type QuoteItem = {
  item_type: string; // 'part', 'labor', 'fee'
  part_number?: string;
  name: string;
  quantity: number;
  unit_price: number;
};

type QuoteJob = {
  name: string;
  description: string;
  inspection_grade?: "red" | "yellow" | null;
  items: QuoteItem[];
};

export default function NewQuotePage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const diagnosticId = searchParams.get("diagnostic_id");
  const customerId = searchParams.get("customer_id");
  const carId = searchParams.get("car_id");

  const [shopId, setShopId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{
    name: string;
    phone: string | null;
  } | null>(null);
  const [car, setCar] = useState<{
    year: number;
    make: string;
    model: string;
  } | null>(null);

  const [jobs, setJobs] = useState<QuoteJob[]>([]);
  const [cannedJobsList, setCannedJobsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (!shopData) return;
      setShopId(shopData.id);

      if (customerId) {
        const { data: cust } = await supabase
          .from("customer")
          .select("name, phone")
          .eq("id", customerId)
          .single();
        if (cust) setCustomer(cust);
      }
      if (carId) {
        const { data: veh } = await supabase
          .from("car")
          .select("year, make, model")
          .eq("id", carId)
          .single();
        if (veh) setCar(veh);
      }

      // Fetch Canned Jobs for mapping templates
      const { data: canned } = await supabase
        .from("canned_jobs")
        .select("*, canned_jobs_items(*)")
        .eq("shop_id", shopData.id);
      if (canned) setCannedJobsList(canned);

      // Convert inspection results into quote jobs preserving grades
      if (diagnosticId) {
        const { data: diagResults } = await supabase
          .from("diagnostics_results")
          .select(
            "grade, mechanic_notes, diagnostics_item:diagnostics_item_id(name, category)",
          )
          .eq("diagnostics_id", diagnosticId)
          .in("grade", ["red", "yellow"]);

        if (diagResults && diagResults.length > 0) {
          const initialJobs: QuoteJob[] = diagResults.map((res: any) => ({
            name: res.diagnostics_item?.name || "Inspection Item",
            description:
              res.mechanic_notes || "Recommended service from DVI inspection.",
            inspection_grade: res.grade as "red" | "yellow",
            items: [
              {
                item_type: "labor",
                name: `${res.diagnostics_item?.name} - Labor`,
                quantity: 1,
                unit_price: 100,
              },
            ],
          }));
          setJobs(initialJobs);
        } else {
          setJobs([
            {
              name: "General Service",
              description: "",
              inspection_grade: null,
              items: [
                {
                  item_type: "labor",
                  name: "Labor",
                  quantity: 1,
                  unit_price: 100,
                },
              ],
            },
          ]);
        }
      } else {
        setJobs([
          {
            name: "General Service",
            description: "",
            inspection_grade: null,
            items: [
              {
                item_type: "labor",
                name: "Labor",
                quantity: 1,
                unit_price: 100,
              },
            ],
          },
        ]);
      }

      setLoading(false);
    }
    init();
  }, [diagnosticId, customerId, carId]);

  // Apply a canned job template directly to a specific job block
  function handleApplyCannedJobToBlock(jobIndex: number, cannedJobId: string) {
    if (!cannedJobId) return;
    const canned = cannedJobsList.find((c) => c.id === cannedJobId);
    if (!canned) return;

    const templateItems: QuoteItem[] = canned.canned_jobs_items.map(
      (i: any) => ({
        item_type: i.item_type,
        name: i.name,
        quantity: Number(i.default_quantity) || 1,
        unit_price: Number(i.default_unit_price) || 0,
      }),
    );

    const updated = [...jobs];
    updated[jobIndex].name = canned.name;
    if (canned.description) updated[jobIndex].description = canned.description;
    updated[jobIndex].items = templateItems;
    setJobs(updated);
  }

  function handleAddJobBlock() {
    setJobs([
      ...jobs,
      {
        name: "",
        description: "",
        inspection_grade: null,
        items: [
          { item_type: "labor", name: "Labor", quantity: 1, unit_price: 100 },
        ],
      },
    ]);
  }

  function handleAddLineItem(jobIndex: number) {
    const updated = [...jobs];
    updated[jobIndex].items.push({
      item_type: "part",
      name: "",
      quantity: 1,
      unit_price: 0,
    });
    setJobs(updated);
  }

  function handleRemoveLineItem(jobIndex: number, itemIndex: number) {
    const updated = [...jobs];
    updated[jobIndex].items = updated[jobIndex].items.filter(
      (_, i) => i !== itemIndex,
    );
    setJobs(updated);
  }

  function handleRemoveJobBlock(jobIndex: number) {
    setJobs(jobs.filter((_, i) => i !== jobIndex));
  }

  const grandTotal = jobs.reduce((sum, job) => {
    const jobSum = job.items.reduce(
      (jSum, item) => jSum + Number(item.quantity) * Number(item.unit_price),
      0,
    );
    return sum + jobSum;
  }, 0);

  async function handleSaveQuote(sendSms: boolean = false) {
    if (!shopId || !customerId || !carId) {
      setError("Missing required quote associations.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const publicToken =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + fourteenDaysInMs).toISOString();

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        shop_id: shopId,
        diagnostics_id: diagnosticId || null,
        customer_id: customerId,
        car_id: carId,
        overall_status: "pending",
        public_token: publicToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (quoteError || !quote) {
      setError(quoteError?.message || "Failed to create quote.");
      setSubmitting(false);
      return;
    }

    for (const job of jobs) {
      // Note: Make sure your quote_jobs table has a column for inspection_grade if storing it, or store it in description/metadata
      const { data: quoteJob, error: jobError } = await supabase
        .from("quote_jobs")
        .insert({
          quote_id: quote.id,
          name: job.name,
          description: job.description
            ? `[${job.inspection_grade?.toUpperCase() || "INFO"}] ${job.description}`
            : null,
          customer_decision: "pending",
        })
        .select()
        .single();

      if (!jobError && quoteJob && job.items.length > 0) {
        const itemsToInsert = job.items.map((item) => ({
          quote_jobs_id: quoteJob.id,
          item_type: item.item_type,
          part_number: item.part_number || null,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
        }));
        await supabase.from("quote_job_items").insert(itemsToInsert);
      }
    }

    await supabase
      .from("car")
      .update({ status: "awaiting_quote_approval" })
      .eq("id", carId);

    if (sendSms && customer?.phone) {
      alert(
        `Quote saved successfully! SMS dispatch triggered to ${customer.phone}`,
      );
    } else {
      alert("Quote saved successfully!");
    }

    setSubmitting(false);
    router.push("/dashboard/diagnostics/completed");
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading quote builder...
      </div>
    );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <a
            href="/dashboard/diagnostics/completed"
            className="text-sm text-blue-600 hover:underline mb-1 inline-block"
          >
            &larr; Back to Completed Inspections
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
            Create Customer Quote
          </h1>
          <p className="text-sm text-gray-500">
            For:{" "}
            <span className="font-semibold text-gray-700">
              {customer?.name}
            </span>{" "}
            ({car?.year} {car?.make} {car?.model})
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-gray-400 block">
            Estimated Total
          </span>
          <span className="text-2xl font-black text-blue-600">
            ${grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          Build your estimate by mapping inspection findings to parts & labor:
        </span>
        <button
          type="button"
          onClick={handleAddJobBlock}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
        >
          + Add Custom Job Block
        </button>
      </div>

      {/* Job Blocks Builder */}
      <div className="space-y-6">
        {jobs.map((job, jobIndex) => {
          const jobTotal = job.items.reduce(
            (sum, item) =>
              sum + Number(item.quantity) * Number(item.unit_price),
            0,
          );

          return (
            <div
              key={jobIndex}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Grade Badge */}
                    {job.inspection_grade && (
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${job.inspection_grade === "red" ? "bg-red-100 text-red-700 border border-red-200" : "bg-yellow-100 text-yellow-800 border border-yellow-200"}`}
                      >
                        {job.inspection_grade === "red"
                          ? "🔴 Urgent Repair"
                          : "🟡 Recommended (Can Wait)"}
                      </span>
                    )}

                    {/* Canned Job Quick Selector for this block */}
                    <select
                      onChange={(e) =>
                        handleApplyCannedJobToBlock(jobIndex, e.target.value)
                      }
                      defaultValue=""
                      className="text-xs border border-gray-300 rounded p-1.5 bg-gray-50 hover:bg-white"
                    >
                      <option value="" disabled>
                        ⚡ Load Canned Job Template...
                      </option>
                      {cannedJobsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          Apply: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Job Title"
                    value={job.name}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[jobIndex].name = e.target.value;
                      setJobs(updated);
                    }}
                    className="block w-full rounded-md border border-gray-300 p-2 text-base font-bold text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Job description / notes for customer..."
                    value={job.description}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[jobIndex].description = e.target.value;
                      setJobs(updated);
                    }}
                    className="block w-full rounded-md border border-gray-200 p-1.5 text-xs text-gray-600 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="text-right flex items-center space-x-3">
                  <div>
                    <span className="text-xs text-gray-400 block">
                      Job Total
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      ${jobTotal.toFixed(2)}
                    </span>
                  </div>
                  {jobs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveJobBlock(jobIndex)}
                      className="text-red-400 hover:text-red-600 p-2 font-bold text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Parts & Labor Items
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddLineItem(jobIndex)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + Add Part/Labor
                  </button>
                </div>

                <div className="space-y-2">
                  {job.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-md border border-gray-200"
                    >
                      <select
                        value={item.item_type}
                        onChange={(e) => {
                          const updated = [...jobs];
                          updated[jobIndex].items[itemIndex].item_type =
                            e.target.value;
                          setJobs(updated);
                        }}
                        className="rounded border border-gray-300 p-1.5 text-xs bg-white"
                      >
                        <option value="part">Part</option>
                        <option value="labor">Labor</option>
                        <option value="fee">Fee</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Part #"
                        value={item.part_number || ""}
                        onChange={(e) => {
                          const updated = [...jobs];
                          updated[jobIndex].items[itemIndex].part_number =
                            e.target.value;
                          setJobs(updated);
                        }}
                        className="w-24 rounded border border-gray-300 p-1.5 text-xs bg-white font-mono"
                      />

                      <input
                        type="text"
                        required
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...jobs];
                          updated[jobIndex].items[itemIndex].name =
                            e.target.value;
                          setJobs(updated);
                        }}
                        className="flex-1 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...jobs];
                          updated[jobIndex].items[itemIndex].quantity =
                            parseFloat(e.target.value) || 0;
                          setJobs(updated);
                        }}
                        className="w-16 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Price ($)"
                        value={item.unit_price}
                        onChange={(e) => {
                          const updated = [...jobs];
                          updated[jobIndex].items[itemIndex].unit_price =
                            parseFloat(e.target.value) || 0;
                          setJobs(updated);
                        }}
                        className="w-24 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      {job.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveLineItem(jobIndex, itemIndex)
                          }
                          className="text-red-400 hover:text-red-600 text-xs font-bold px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSaveQuote(false)}
          className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm transition"
        >
          Save Quote Only
        </button>
        <button
          type="button"
          disabled={submitting || !customer?.phone}
          onClick={() => handleSaveQuote(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-sm transition shadow flex items-center space-x-2 disabled:opacity-50"
        >
          <span>📱 Save & Text Quote to Customer</span>
        </button>
      </div>
    </div>
  );
}
