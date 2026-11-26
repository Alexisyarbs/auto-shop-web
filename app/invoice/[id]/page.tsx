import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "../../../utils/supabase/server";
import PayButton from "./PayButton";

async function InvoiceDetails({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  // 1. Try finding an existing invoice by quote_id first, then by invoice id
  let { data: rawInvoice } = await supabase
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
    .eq("quote_id", id)
    .maybeSingle();

  if (!rawInvoice) {
    const byId = await supabase
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
      .eq("id", id)
      .maybeSingle();

    rawInvoice = byId.data;
  }

  // 2. If no invoice row exists yet, load the quote/estimate directly so the page isn't blank
  if (!rawInvoice) {
    const { data: quote } = await supabase
      .from("quotes")
      .select(
        `
        id,
        overall_status,
        shop:shop_id ( shop_name, address, phone ),
        customer:customer_id ( name, phone ),
        car:car_id ( year, make, model, vin, miles ),
        quote_jobs (
          name,
          description,
          customer_decision,
          quote_job_items ( quantity, unit_price )
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (!quote) {
      return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500">
          No invoice or estimate found for ID: {id}
        </div>
      );
    }

    const jobs = Array.isArray(quote.quote_jobs) ? quote.quote_jobs : [];
    const approvedJobs = jobs.filter(
      (j: any) => j.customer_decision === "approved",
    );
    const billableJobs = approvedJobs.length > 0 ? approvedJobs : jobs;

    const subtotal = billableJobs.reduce((sum: number, job: any) => {
      const items = Array.isArray(job.quote_job_items)
        ? job.quote_job_items
        : [];
      const jobTotal = items.reduce(
        (iSum: number, item: any) =>
          iSum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0,
      );
      return sum + jobTotal;
    }, 0);

    rawInvoice = {
      id: quote.id,
      quote_id: quote.id,
      subtotal,
      tax: 0,
      total: subtotal,
      status: "pending_invoice",
      shop: quote.shop,
      customer: quote.customer,
      car: quote.car,
      invoice_job: billableJobs.map((j: any) => ({
        name: j.name,
        description: j.description,
      })),
    };
  }

  const invoice = {
    ...rawInvoice,
    shop: Array.isArray(rawInvoice.shop) ? rawInvoice.shop[0] : rawInvoice.shop,
    customer: Array.isArray(rawInvoice.customer)
      ? rawInvoice.customer[0]
      : rawInvoice.customer,
    car: Array.isArray(rawInvoice.car) ? rawInvoice.car[0] : rawInvoice.car,
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {invoice.shop?.shop_name || "Auto Repair Shop"}
          </h1>
          <p className="text-sm text-gray-500">{invoice.shop?.address}</p>
          <p className="text-sm text-gray-500">{invoice.shop?.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800 uppercase">Invoice</h2>
          <p className="text-xs text-gray-500">
            Ref #: {String(invoice.id).slice(0, 8).toUpperCase()}
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

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 text-sm uppercase">Services</h3>
        {invoice.invoice_job?.map((job: any, index: number) => (
          <div key={index} className="border-b pb-3">
            <p className="font-bold text-sm text-gray-900">{job.name}</p>
            <p className="text-xs text-gray-500">{job.description}</p>
          </div>
        ))}
      </div>

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

      {invoice.status !== "paid" && invoice.quote_id && (
        <div className="pt-6 border-t">
          <PayButton quoteId={invoice.quote_id} />
        </div>
      )}
    </div>
  );
}

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center text-gray-500">
            Loading invoice...
          </div>
        }
      >
        <InvoiceDetails params={params} />
      </Suspense>
    </div>
  );
}
