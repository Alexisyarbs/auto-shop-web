"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type QuoteRow = {
  id: string;
  created_at: string;
  overall_status: string;
  public_token: string;
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline mb-1 inline-block"
          >
            &larr; Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
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
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">Vehicle & Customer</th>
                <th className="px-6 py-3 font-semibold">Created Date</th>
                <th className="px-6 py-3 font-semibold">Total Amount</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quotes.map((quote) => {
                // Calculate quote total
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
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">
                        {quote.car?.year} {quote.car?.make} {quote.car?.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        {quote.customer?.name} (
                        {quote.customer?.phone || "No phone"})
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600">
                      ${total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 uppercase">
                        {quote.overall_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
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
