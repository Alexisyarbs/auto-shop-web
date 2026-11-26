"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { parseAndFetchObdCodes } from "@/utils/obdFetcher"; // 👈 Imported parser

// Client component to render translated OBD codes
function PublicObdBadge({ rawCodes }: { rawCodes: string | null }) {
  const [decoded, setDecoded] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawCodes) return;
    async function loadCodes() {
      setLoading(true);
      const results = await parseAndFetchObdCodes(rawCodes || "");
      setDecoded(results);
      setLoading(false);
    }
    loadCodes();
  }, [rawCodes]);

  if (!rawCodes) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3 mb-6">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Scanned OBD-II Trouble Codes
        </h4>
        <span className="text-[10px] text-gray-400">Powered by AutoTools</span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 animate-pulse">
          Translating trouble codes...
        </p>
      ) : (
        <div className="space-y-2">
          {decoded.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded text-xs">
                  {item.code}
                </span>
                <span className="text-gray-900 font-semibold">
                  {item.meaning}
                </span>
              </div>
              {item.system && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded self-start sm:self-auto">
                  {item.system}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicQuoteContent() {
  const supabase = createClient();
  const params = useParams();
  const token = params.token as string;

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // E-Signature and submission state
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchPublicQuote() {
      if (!token) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          shop:shop_id ( shop_name, address ),
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

      if (error) {
        console.error("SUPABASE FETCH ERROR:", error);
      }

      if (error || !data) {
        setError("Quote not found or link has expired.");
      } else {
        setQuote(data);
        if (data.overall_status && data.overall_status !== "pending") {
          setSubmitted(true);
        }
      }
      setLoading(false);
    }
    fetchPublicQuote();
  }, [token]);

  function handleToggleDecision(
    jobId: string,
    decision: "approved" | "declined",
  ) {
    if (submitted) return;
    setQuote({
      ...quote,
      quote_jobs: quote.quote_jobs.map((j: any) =>
        j.id === jobId ? { ...j, customer_decision: decision } : j,
      ),
    });
  }

  async function handleSubmitApprovals(e: React.FormEvent) {
    e.preventDefault();
    if (!signature.trim() || !agreed) return;

    setSubmitting(true);

    try {
      for (const job of quote.quote_jobs) {
        await supabase
          .from("quote_jobs")
          .update({ customer_decision: job.customer_decision || "declined" })
          .eq("id", job.id);
      }

      const hasApproved = quote.quote_jobs.some(
        (j: any) => j.customer_decision === "approved",
      );
      const newOverallStatus = hasApproved ? "approved" : "declined";
      const newCarStatus = hasApproved
        ? "repair_approved"
        : "estimate_declined";

      await supabase
        .from("quotes")
        .update({
          overall_status: newOverallStatus,
          customer_signature: signature,
          approved_at: new Date().toISOString(),
        })
        .eq("id", quote.id);

      if (quote.car_id) {
        await supabase
          .from("car")
          .update({ status: newCarStatus })
          .eq("id", quote.car_id);
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting approval:", err);
      alert("Failed to submit approval. Please try again.");
    } finally {
      setSubmitting(false);
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
            Digital Vehicle Inspection & Repair Estimate
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
          </p>
        </div>
        {/* Live Vehicle Status Progress Bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Repair Status Tracker
          </h3>

          {(() => {
            const status = quote.overall_status || "pending";

            const stages = [
              {
                key: "pending",
                label: "Awaiting Approval",
                activeStatuses: ["pending"],
              },
              {
                key: "approved",
                label: "Ordering Parts",
                activeStatuses: ["approved"],
              },
              {
                key: "parts_ordered",
                label: "Awaiting Parts Arrival",
                activeStatuses: ["parts_ordered"],
              },
              {
                key: "parts_arrived",
                label: "Parts Arrived",
                activeStatuses: ["parts_arrived"],
              },
              {
                key: "in_repair",
                label: "In Repair",
                activeStatuses: ["in_repair"],
              },
              {
                key: "completed",
                label: "Ready for Pickup",
                activeStatuses: ["completed"],
              },
            ];

            const statusOrder = [
              "pending",
              "approved",
              "parts_ordered",
              "parts_arrived",
              "in_repair",
              "completed",
            ];
            const currentIndex = statusOrder.indexOf(status);

            const statusMessages: Record<string, string> = {
              pending: "Please review and approve your estimate below.",
              approved:
                "Estimate approved — our service advisor is placing your parts order.",
              parts_ordered:
                "Parts have been ordered and we are waiting for delivery.",
              parts_arrived:
                "Parts have arrived at the shop and are staged for your bay.",
              in_repair: "A technician is actively working on your vehicle.",
              completed:
                "Your repair is complete and your vehicle is ready for pickup.",
            };

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  {stages.map((stage, idx) => {
                    const isCurrent = status === stage.key;
                    const isDone = currentIndex > idx;

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-lg border text-xs font-bold transition ${
                          isCurrent
                            ? "bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300"
                            : isDone
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                              : "bg-gray-50 border-gray-200 text-gray-400"
                        }`}
                      >
                        {idx + 1}. {stage.label}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-center text-gray-600 italic">
                  {statusMessages[status] ||
                    "Tracking your vehicle service progress."}
                </p>
              </div>
            );
          })()}
        </div>

        {/* DVI Inspection Findings & OBD Codes */}
        {quote.diagnostics && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
              🔍 Multi-Point Inspection Findings
            </h3>

            {/* Render Translated OBD Codes Badge */}
            <PublicObdBadge rawCodes={quote.diagnostics.obd_codes} />

            {/* Findings List */}
            {quote.diagnostics.diagnostics_results &&
              quote.diagnostics.diagnostics_results.length > 0 && (
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
                        </div>
                        <p className="text-xs text-gray-600 pl-6">
                          {res.mechanic_notes || "Checked and inspected."}
                        </p>
                      </div>

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
              )}
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
                {submitted
                  ? "Estimate has been submitted and locked."
                  : "Select approve or decline for each job below."}
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
                      {!submitted && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleDecision(job.id, "approved")
                            }
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${isApproved ? "bg-green-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-green-100"}`}
                          >
                            {isApproved ? "✓ Approved" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleDecision(job.id, "declined")
                            }
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${isDeclined ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-red-100"}`}
                          >
                            {isDeclined ? "✕ Declined" : "Decline"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

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

          {/* Submission & E-Signature Box */}
          {submitted ? (
            <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
              <h4 className="text-lg font-bold text-green-800">
                ✅ Estimate Successfully Submitted!
              </h4>
              <p className="text-sm text-green-700">
                Thank you! Your choices and signature have been sent to the
                service team. We will be in touch shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitApprovals}
              className="pt-6 border-t space-y-4"
            >
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-900">
                  Authorization & E-Signature *
                </label>
                <p className="text-xs text-gray-500">
                  By signing below, you authorize the shop to perform the
                  approved repairs listed above at the specified total estimate.
                </p>
                <input
                  type="text"
                  required
                  placeholder="Type your full legal name as signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="agree"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="agree"
                  className="text-xs text-gray-700 select-none"
                >
                  I agree to the repair terms and authorize the selected
                  services.
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !signature.trim() || !agreed}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow transition"
              >
                {submitting
                  ? "Submitting Authorization..."
                  : "Submit Repair Authorization"}
              </button>
            </form>
          )}
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
          Loading quote approval...
        </div>
      }
    >
      <PublicQuoteContent />
    </Suspense>
  );
}
