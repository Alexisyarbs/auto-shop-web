"use client";

import { useState } from "react";
import { createInvoiceCheckoutSession } from "@/app/dashboard/invoices/[quoteId]/actions";

export default function PayButton({ quoteId }: { quoteId: string }) {
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
