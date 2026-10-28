"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

function PublicQuoteContent() {
  const supabase = createClient();
  const params = useParams();
  const token = params.token as string;

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicQuote() {
      if (!token) return;
      setLoading(true);

      // Fetch quote by public token with all related shop, customer, car, jobs, and diagnostic inspection findings
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          shop:shop_id ( shop_name, phone, address ),
          customer:customer_id ( name, phone ),
          car:car_id ( year, make, model, vin, miles ),
          quote_jobs (
            id,
            name,
            description,
            customer_decision,
            quote_job_items ( id, item_type, part_number, name, quantity, unit_price )
          ),
          diagnostics:diagnostics_id (
            id,
            obd_codes,
            vehicle_mileage,
            diagnostics_results (
              id,
              grade,
              mechanic_notes,
              media_url,
              diagnostics_item:diagnostics_item_id ( name, category )
            )
          )
        `,
        )
        .eq("public_token", token)
        .single();

      if (error || !data) {
        setError("Quote not found or link has expired.");
      } else {
        setQuote(data);
      }
      setLoading(false);
    }
    fetchPublicQuote();
  }, [token]);

  async function handleUpdateDecision(
    jobId: string,
    decision: "approved" | "declined",
  ) {
    const { error } = await supabase
      .from("quote_jobs")
      .update({ customer_decision: decision })
      .eq("id", jobId);

    if (!error) {
      setQuote({
        ...quote,
        quote_jobs: quote.quote_jobs.map((j: any) =>
          j.id === jobId ? { ...j, customer_decision: decision } : j,
        ),
      });
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading your vehicle report & estimate...
      </div>
    );
  if (error || !quote)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">
        {error}
      </div>
    );

  // Calculate total of approved jobs
  const approvedTotal = quote.quote_jobs.reduce((sum: number, job: any) => {
    if (job.customer_decision === "approved") {
      const jobSum = job.quote_job_items.reduce(
        (iSum: number, item: any) =>
          iSum + Number(item.quantity) * Number(item.unit_price),
        0,
      );
      return sum + jobSum;
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Shop Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center space-y-1">
          <h1 className="text-2xl font-black text-gray-900">
            {quote.shop?.shop_name || "Auto Repair Shop"}
          </h1>
          <p className="text-sm text-gray-500">
            {quote.shop?.phone} | Digital Vehicle Inspection & Estimate
          </p>
        </div>

        {/* Vehicle & Customer Summary */}
        <div className="bg-blue-900 text-white p-6 rounded-xl shadow-md space-y-2">
          <span className="text-xs uppercase font-semibold tracking-wider bg-blue-800 px-2.5 py-1 rounded">
            Vehicle Inspection Report
          </span>
          <h2 className="text-xl font-bold">
            {quote.car?.year} {quote.car?.make} {quote.car?.model}
          </h2>
          <p className="text-sm text-blue-200">
            Owner: {quote.customer?.name}{" "}
            {quote.car?.miles ? `• ${quote.car.miles.toLocaleString()} mi` : ""}
            {quote.diagnostics?.obd_codes
              ? ` • OBD Codes: ${quote.diagnostics.obd_codes}`
              : ""}
          </p>
        </div>

        {/* DVI Inspection Findings with Photos/Videos */}
        {quote.diagnostics?.diagnostics_results &&
          quote.diagnostics.diagnostics_results.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
                🔍 Multi-Point Inspection Findings
              </h3>
              <div className="space-y-4">
                {quote.diagnostics.diagnostics_results.map((res: any) => (
                  <div
                    key={res.id}
                    className={`p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${res.grade === "red" ? "bg-red-50 border-red-200" : res.grade === "yellow" ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span>
                          {res.grade === "red"
                            ? "🔴"
                            : res.grade === "yellow"
                              ? "🟡"
                              : "🟢"}
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {res.diagnostics_item?.name}
                        </h4>
                        <span className="text-xs uppercase bg-white px-2 py-0.5 rounded border text-gray-600">
                          {res.diagnostics_item?.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 pl-6">
                        {res.mechanic_notes || "Checked and inspected."}
                      </p>
                    </div>

                    {/* Inspection Photo/Video preview */}
                    {res.media_url && (
                      <div className="w-full sm:w-28 h-20 bg-black rounded overflow-hidden flex-shrink-0 border">
                        {res.media_url.includes(".mp4") ||
                        res.media_url.includes(".mov") ? (
                          <video
                            src={res.media_url}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <a
                            href={res.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={res.media_url}
                              alt="Inspection finding"
                              className="w-full h-full object-cover hover:opacity-95 transition"
                            />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Interactive Quote & Approval Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Repair Estimate
              </h3>
              <p className="text-xs text-gray-500">
                Review jobs below and approve what you would like done.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block uppercase">
                Approved Total
              </span>
              <span className="text-2xl font-black text-blue-600">
                ${approvedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {quote.quote_jobs.map((job: any) => {
              const jobTotal = job.quote_job_items.reduce(
                (sum: number, i: any) =>
                  sum + Number(i.quantity) * Number(i.unit_price),
                0,
              );
              const isApproved = job.customer_decision === "approved";
              const isDeclined = job.customer_decision === "declined";

              return (
                <div
                  key={job.id}
                  className={`p-5 rounded-xl border transition ${isApproved ? "border-green-500 bg-green-50/20" : isDeclined ? "border-gray-300 opacity-60 bg-gray-50" : "border-gray-200 bg-white"}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">
                        {job.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {job.description || "Authorized service package."}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="font-black text-gray-900 text-lg">
                        ${jobTotal.toFixed(2)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdateDecision(job.id, "approved")
                          }
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${isApproved ? "bg-green-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-green-100"}`}
                        >
                          {isApproved ? "✓ Approved" : "Approve"}
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateDecision(job.id, "declined")
                          }
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${isDeclined ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100"}`}
                        >
                          {isDeclined ? "✕ Declined" : "Decline"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="pt-3 space-y-2">
                    {job.quote_job_items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs text-gray-600"
                      >
                        <span>
                          <span className="font-mono uppercase bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                            {item.item_type}
                          </span>
                          {item.name} ({item.quantity}x)
                        </span>
                        <span className="font-semibold text-gray-900">
                          $
                          {(
                            Number(item.quantity) * Number(item.unit_price)
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicQuotePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading quote builder...
        </div>
      }
    >
      <PublicQuoteContent />
    </Suspense>
  );
}
