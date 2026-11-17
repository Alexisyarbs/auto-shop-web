"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

function InvoiceContent() {
  const supabase = createClient();
  const params = useParams();
  const quoteId = params.quoteId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoice() {
      if (!quoteId) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("quotes")
        .select(
          `
          *,
          shop:shop_id ( shop_name, address, phone ),
          customer:customer_id ( name, phone ),
          car:car_id ( year, make, model, vin, miles ),
          quote_jobs (
            id,
            name,
            description,
            customer_decision,
            quote_job_items ( id, item_type, part_number, name, quantity, unit_price )
          )
        `,
        )
        .eq("id", quoteId)
        .single();

      if (!error && data) {
        setInvoice(data);
      }
      setLoading(false);
    }
    fetchInvoice();
  }, [quoteId]);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Generating invoice...</div>
    );
  if (!invoice)
    return (
      <div className="p-8 text-center text-red-600">Invoice not found.</div>
    );

  // Calculate totals for approved jobs only
  const subtotal = invoice.quote_jobs.reduce((sum: number, job: any) => {
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

  const tax = subtotal * 0.08; // Adjust tax rate as needed for your shop
  const grandTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none space-y-8">
        {/* Action Controls (Hidden when printing) */}
        <div className="flex justify-between items-center print:hidden border-b pb-4">
          <a
            href="/dashboard/quotes"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Quotes
          </a>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow transition"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {invoice.shop?.shop_name || "Auto Repair Shop"}
            </h1>
            <p className="text-sm text-gray-500">{invoice.shop?.address}</p>
            <p className="text-sm text-gray-500">{invoice.shop?.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
              Invoice
            </h2>
            <p className="text-xs text-gray-500">
              Invoice #: {invoice.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-gray-500">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg print:bg-gray-50 text-sm">
          <div>
            <h3 className="font-bold text-gray-700 uppercase text-xs mb-1">
              Billed To:
            </h3>
            <p className="font-semibold text-gray-900">
              {invoice.customer?.name}
            </p>
            <p className="text-gray-600">{invoice.customer?.phone}</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 uppercase text-xs mb-1">
              Vehicle Details:
            </h3>
            <p className="font-semibold text-gray-900">
              {invoice.car?.year} {invoice.car?.make} {invoice.car?.model}
            </p>
            <p className="text-gray-600">
              VIN: {invoice.car?.vin || "N/A"} | Miles:{" "}
              {invoice.car?.miles?.toLocaleString() || "N/A"}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-6">
          <h3 className="font-bold text-gray-900 text-sm uppercase">
            Approved Services & Parts
          </h3>
          {invoice.quote_jobs
            .filter((job: any) => job.customer_decision === "approved")
            .map((job: any) => (
              <div key={job.id} className="border-b pb-4 space-y-2">
                <div className="flex justify-between font-bold text-sm text-gray-900">
                  <span>{job.name}</span>
                </div>
                <div className="pl-4 space-y-1">
                  {job.quote_job_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs text-gray-600"
                    >
                      <span>
                        {item.name} ({item.quantity}x @ $
                        {Number(item.unit_price).toFixed(2)})
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
            ))}
        </div>

        {/* Totals Section */}
        <div className="flex justify-end pt-4">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Estimated Tax (8%):</span>
              <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-gray-900 border-t pt-2">
              <span>Total Due:</span>
              <span className="text-blue-600">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Signature & Footer */}
        {invoice.customer_signature && (
          <div className="pt-6 border-t text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">
              Authorized Electronically By:
            </p>
            <p className="italic text-gray-900 font-serif text-base">
              {invoice.customer_signature}
            </p>
            <p>Signed on: {new Date(invoice.approved_at).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center">Loading invoice...</div>}
    >
      <InvoiceContent />
    </Suspense>
  );
}
