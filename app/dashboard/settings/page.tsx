"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";
import { connectStripeAccount } from "./actions";

function SettingsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      // Fetch shop and join parent business
      const { data: shopData } = await supabase
        .from("shop")
        .select(
          `
          *,
          business:business_id (*)
        `,
        )
        .limit(1)
        .single();

      if (shopData) {
        setShop(shopData);
        setBusiness(shopData.business);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleStripeConnect() {
    if (!business) return;
    setConnecting(true);

    const result = await connectStripeAccount(
      business.id,
      business.email,
      business.stripe_account,
    );

    setConnecting(false);

    if (result.url) {
      window.location.href = result.url;
    } else {
      alert("Failed to initialize Stripe onboarding.");
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading settings...</div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-1 inline-block"
        >
          &larr; Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold text-gray-950">
          Shop & Business Settings
        </h1>
        <p className="text-sm text-gray-500">
          Manage your shop profile details and payment processing accounts.
        </p>
      </div>

      {/* SHOP PROFILE CARD */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Shop Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">
              Shop Name
            </span>
            <span className="font-semibold text-gray-800">
              {shop?.shop_name || "N/A"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">
              Phone
            </span>
            <span className="font-semibold text-gray-800">
              {shop?.phone || "N/A"}
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="block text-xs font-bold text-gray-400 uppercase">
              Address
            </span>
            <span className="font-semibold text-gray-800">
              {shop?.address || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* STRIPE CONNECT PAYOUTS CARD */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Stripe Payout Integration
          </h2>
          <p className="text-xs text-gray-500">
            Connect your business bank account to receive direct payouts when
            customers pay invoices online.
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-gray-50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="block text-xs font-bold text-gray-500 uppercase">
              Stripe Account Status
            </span>
            {business?.stripe_account ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ● Connected ({business.stripe_account})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                ● Not Connected
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={connecting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow transition disabled:opacity-50"
          >
            {connecting
              ? "Opening Stripe..."
              : business?.stripe_account
                ? "Manage Stripe Account"
                : "Connect with Stripe ⚡"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">Loading settings...</div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
