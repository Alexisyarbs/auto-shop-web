import { createClient } from "../../../utils/supabase/server";
import { createInvoiceCheckoutSession } from "@/app/dashboard/invoices/[quoteId]/actions";

// Client component for the payment button
("use client");

import { useState } from "react";

function PayButton({ quoteId }: { quoteId: string }) {
  const [paying, setPaying] = useState(false);

  async function handleCheckout() {
    try {
      setPaying(true);
      const { url } = await createInvoiceCheckoutSession(quoteId);
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setPaying(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={paying}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <span>
        {paying ? "Redirecting to Stripe..." : "💳 Pay Invoice with Stripe"}
      </span>
    </button>
  );
}

// Server component page
export default async function PublicInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: rawInvoice, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      total,
      subtotal,
      tax,
      status,
      quote_id,
      shop:shop_id ( shop_name, address, phone ),
      customer:customer_id ( name, phone ),
      car:car_id ( year, make, model, vin, miles ),
      invoice_job (
        name,
        description
      )
    `,
    )
    .eq("id", params.id)
    .single();

  if (error || !rawInvoice) {
    return (
      <div className="p-8 text-center text-gray-500">
        Invoice not found or link has expired.
      </div>
    );
  }

  // Normalize joined relations from arrays to single objects safely
  const invoice = {
    ...rawInvoice,
    shop: Array.isArray(rawInvoice.shop) ? rawInvoice.shop[0] : rawInvoice.shop,
    customer: Array.isArray(rawInvoice.customer)
      ? rawInvoice.customer[0]
      : rawInvoice.customer,
    car: Array.isArray(rawInvoice.car) ? rawInvoice.car[0] : rawInvoice.car,
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        {/* Shop Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {invoice.shop?.shop_name || "Auto Repair Shop"}
            </h1>
            <p className="text-sm text-gray-500">{invoice.shop?.address}</p>
            <p className="text-sm text-gray-500">{invoice.shop?.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 uppercase">
              Invoice
            </h2>
            <p className="text-xs text-gray-500">
              Invoice #: {invoice.id.slice(0, 8).toUpperCase()}
            </p>
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase mt-1 ${
                invoice.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Customer & Vehicle */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
          <div>
            <h3 className="font-bold text-gray-700 uppercase text-xs mb-1">
              Billed To:
            </h3>
            <p className="font-semibold text-gray-900">
              {invoice.customer?.name}
            </p>
            <p className="text-xs text-gray-500">{invoice.customer?.phone}</p>
          </div>
          <div>
            <h3 className="font-bold text-gray-700 uppercase text-xs mb-1">
              Vehicle:
            </h3>
            <p className="font-semibold text-gray-900">
              {invoice.car?.year} {invoice.car?.make} {invoice.car?.model}
            </p>
            <p className="text-xs text-gray-500">
              VIN: {invoice.car?.vin || "N/A"}
            </p>
          </div>
        </div>

        {/* Jobs / Services */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm uppercase">
            Completed Services
          </h3>
          {invoice.invoice_job?.map((job: any, index: number) => (
            <div key={index} className="border-b pb-3">
              <p className="font-bold text-sm text-gray-900">{job.name}</p>
              <p className="text-xs text-gray-500">{job.description}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax:</span>
            <span>${Number(invoice.tax || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-gray-900 border-t pt-2">
            <span>Total Due:</span>
            <span className="text-blue-600">
              ${Number(invoice.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Section */}
        {invoice.status !== "paid" && invoice.quote_id && (
          <div className="pt-6 border-t">
            <PayButton quoteId={invoice.quote_id} />
          </div>
        )}
      </div>
    </div>
  );
}
