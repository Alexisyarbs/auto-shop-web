"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type QuoteRow = {
  id: string;
  created_at: string;
  overall_status: string;
  public_token: string;
  car_id?: string;
  customer?: { name: string; phone: string };
  car?: { year: number; make: string; model: string };
  quote_jobs?: {
    customer_decision: string;
    quote_job_items: { quantity: number; unit_price: number }[];
  }[];
};

function QuotesHubContent() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          customer:customer_id ( name, phone ),
          car:car_id ( year, make, model ),
          quote_jobs (
            customer_decision,
            quote_job_items ( quantity, unit_price )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setQuotes(data);
      }
      setLoading(false);
    }
    fetchQuotes();
  }, []);

  async function handleUpdateStatus(
    quoteId: string,
    carId?: string,
    nextStage?: string,
  ) {
    let newQuoteStatus = nextStage;
    let newCarStatus = nextStage;

    const { error: quoteError } = await supabase
      .from("quotes")
      .update({ overall_status: newQuoteStatus })
      .eq("id", quoteId);

    if (quoteError) {
      console.error("Error updating quote status:", quoteError);
      alert("Failed to update status.");
      return;
    }

    if (carId) {
      await supabase
        .from("car")
        .update({ status: newCarStatus })
        .eq("id", carId);
    }

    setQuotes(
      quotes.map((q) =>
        q.id === quoteId ? { ...q, overall_status: newQuoteStatus! } : q,
      ),
    );
  }

  function handleTextInvoice(
    phone: string,
    quoteId: string,
    customerName: string,
  ) {
    const invoiceUrl = `${window.location.origin}/dashboard/invoices/${quoteId}`;
    const message = `Hi ${customerName}, your vehicle service is complete! Here is your final invoice: ${invoiceUrl}`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  function handleTextQuote(phone: string, token: string, customerName: string) {
    const quoteUrl = `${window.location.origin}/quote/${token}`;
    const message = `Hi ${customerName}, here is your vehicle repair estimate: ${quoteUrl}`;
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  }

  function handleCopyLink(token: string) {
    const quoteUrl = `${window.location.origin}/quote/${token}`;
    navigator.clipboard.writeText(quoteUrl);
    alert("Public quote link copied to clipboard!");
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline mb-1 inline-block"
          >
            &larr; Back to Dashboard
          </a>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Customer Quotes & Estimates
          </h1>
          <p className="text-sm text-gray-500">
            Manage all sent estimates, track customer decisions, and re-send
            links.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading quotes...</div>
      ) : quotes.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
          No quotes created yet. Convert a completed inspection into a quote to
          see it here!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table Header */}
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 font-semibold">Vehicle & Customer</th>
                <th className="px-6 py-3 font-semibold">Created Date</th>
                <th className="px-6 py-3 font-semibold">Total Amount</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white block md:table-row-group">
              {quotes.map((quote) => {
                const total =
                  quote.quote_jobs?.reduce((sum, job) => {
                    const jobSum =
                      job.quote_job_items?.reduce(
                        (iSum, i) =>
                          iSum + Number(i.quantity) * Number(i.unit_price),
                        0,
                      ) || 0;
                    return sum + jobSum;
                  }, 0) || 0;

                return (
                  <tr
                    key={quote.id}
                    className="hover:bg-gray-50 block md:table-row p-4 md:p-0 border-b md:border-none"
                  >
                    {/* Vehicle & Customer */}
                    <td className="px-4 md:px-6 py-3 md:py-4 block md:table-cell">
                      <div className="font-bold text-gray-900 text-base md:text-sm">
                        {quote.car?.year} {quote.car?.make} {quote.car?.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        {quote.customer?.name} (
                        {quote.customer?.phone || "No phone"})
                      </div>
                      {/* Mobile meta info */}
                      <div className="flex items-center gap-3 mt-2 md:hidden text-xs text-gray-600">
                        <span>
                          📅 {new Date(quote.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-bold text-blue-600">
                          ${total.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-800 uppercase text-[10px]">
                          {quote.overall_status}
                        </span>
                      </div>
                    </td>

                    {/* Created Date (Desktop) */}
                    <td className="px-6 py-4 text-gray-600 hidden md:table-cell">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>

                    {/* Total Amount (Desktop) */}
                    <td className="px-6 py-4 font-black text-blue-600 hidden md:table-cell">
                      ${total.toFixed(2)}
                    </td>

                    {/* Status (Desktop) */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 uppercase">
                        {quote.overall_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 md:px-6 py-3 md:py-4 block md:table-cell md:text-right">
                      <div className="flex items-center md:justify-end gap-2 flex-wrap mt-2 md:mt-0">
                        {quote.overall_status === "approved" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                quote.id,
                                quote.car_id,
                                "parts_ordered",
                              )
                            }
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-medium transition"
                          >
                            📦 Mark Parts Ordered
                          </button>
                        )}

                        {quote.overall_status === "parts_ordered" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                quote.id,
                                quote.car_id,
                                "parts_arrived",
                              )
                            }
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-medium transition"
                          >
                            ✅ Parts Arrived
                          </button>
                        )}

                        {quote.overall_status === "parts_arrived" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                quote.id,
                                quote.car_id,
                                "in_repair",
                              )
                            }
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium transition"
                          >
                            🔧 Start Repair Work
                          </button>
                        )}

                        {quote.overall_status === "in_repair" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                quote.id,
                                quote.car_id,
                                "completed",
                              )
                            }
                            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded font-medium transition"
                          >
                            🏁 Complete & Invoice
                          </button>
                        )}

                        {quote.overall_status === "completed" && (
                          <>
                            <a
                              href={`/dashboard/invoices/${quote.id}`}
                              className="text-xs bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded font-medium transition"
                            >
                              📄 View Invoice
                            </a>
                            {quote.customer?.phone && (
                              <button
                                onClick={() =>
                                  handleTextInvoice(
                                    quote.customer!.phone,
                                    quote.id,
                                    quote.customer!.name,
                                  )
                                }
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium transition"
                              >
                                📱 Text Invoice
                              </button>
                            )}
                          </>
                        )}

                        <a
                          href={`/quote/${quote.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium transition"
                        >
                          View Web Page
                        </a>
                        <button
                          onClick={() => handleCopyLink(quote.public_token)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium transition"
                        >
                          Copy Link
                        </button>
                        {quote.customer?.phone && (
                          <button
                            onClick={() =>
                              handleTextQuote(
                                quote.customer!.phone,
                                quote.public_token,
                                quote.customer!.name,
                              )
                            }
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium transition"
                          >
                            📱 Re-Text Quote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function QuotesHubPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <QuotesHubContent />
    </Suspense>
  );
}
