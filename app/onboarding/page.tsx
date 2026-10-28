"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Data State
  const [business, setBusiness] = useState({
    legalName: "",
    displayName: "",
    phone: "",
  });
  const [shop, setShop] = useState({
    shopName: "",
    useDisplayName: true,
  });

  // --- Step Handlers ---
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  // --- Final Submission ---
  async function handleCompleteSetup() {
    setLoading(true);
    setError(null);

    try {
      // 1. Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("No user logged in.");

      // 2. Insert Business
      const { data: newBusiness, error: bizError } = await supabase
        .from("business")
        .insert({
          legal_name: business.legalName,
          display_name: business.displayName,
          phone: business.phone,
          email: user.email, // Using their login email as the business contact for now
          status: "active",
        })
        .select()
        .single();

      if (bizError) throw bizError;

      // 3. Insert Shop
      const finalShopName = shop.useDisplayName
        ? business.displayName
        : shop.shopName;
      const { data: newShop, error: shopError } = await supabase
        .from("shop")
        .insert({
          business_id: newBusiness.id,
          shop_name: finalShopName,
          status: "active",
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // Note: In a fully complete app, you will also insert their user ID into
      // the 'shop_user' table here so they have Admin access to this new shop.

      // Success! Send them to the dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong setting up your shop.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
        {/* Progress Indicator */}
        <div className="mb-8 flex justify-between text-sm font-medium text-gray-400">
          <span className={step >= 1 ? "text-blue-600" : ""}>1. Business</span>
          <span className={step >= 2 ? "text-blue-600" : ""}>2. Shop</span>
          <span className={step >= 3 ? "text-blue-600" : ""}>3. Finish</span>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1: Business Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Business Details
            </h2>
            <p className="text-sm text-gray-500">
              Let's start with your official company info.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Legal Business Name
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={business.legalName}
                onChange={(e) =>
                  setBusiness({ ...business, legalName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name (DBA)
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={business.displayName}
                onChange={(e) =>
                  setBusiness({ ...business, displayName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Phone
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                value={business.phone}
                onChange={(e) =>
                  setBusiness({ ...business, phone: e.target.value })
                }
              />
            </div>

            <button
              onClick={nextStep}
              disabled={
                !business.legalName || !business.displayName || !business.phone
              }
              className="mt-6 w-full rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Next Step
            </button>
          </div>
        )}

        {/* STEP 2: Shop Details */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Your First Shop
            </h2>
            <p className="text-sm text-gray-500">
              You can add multiple locations later.
            </p>

            <div className="flex items-center space-x-2 py-4">
              <input
                type="checkbox"
                id="sameName"
                checked={shop.useDisplayName}
                onChange={(e) =>
                  setShop({ ...shop, useDisplayName: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="sameName"
                className="text-sm font-medium text-gray-700"
              >
                Shop name is the same as Display Name
              </label>
            </div>

            {!shop.useDisplayName && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location / Shop Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Downtown Auto"
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  value={shop.shopName}
                  onChange={(e) =>
                    setShop({ ...shop, shopName: e.target.value })
                  }
                />
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <button
                onClick={prevStep}
                className="w-1/3 rounded-md border border-gray-300 p-3 text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!shop.useDisplayName && !shop.shopName}
                className="w-2/3 rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Subscription & Finish */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Ready to Start!
            </h2>
            <p className="text-sm text-gray-500">
              Start your 14-day free trial today. No credit card required to
              look around.
            </p>

            <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6">
              <h3 className="text-lg font-bold text-blue-900">Pro Shop Plan</h3>
              <p className="mt-2 text-sm text-blue-700">
                Unlimited quotes, invoices, and employee accounts.
              </p>
              <p className="mt-4 text-2xl font-black text-blue-900">
                $99<span className="text-sm font-normal">/mo</span>
              </p>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={prevStep}
                disabled={loading}
                className="w-1/3 rounded-md border border-gray-300 p-3 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCompleteSetup}
                disabled={loading}
                className="w-2/3 rounded-md bg-green-600 p-3 text-white hover:bg-green-700 disabled:opacity-50 flex justify-center items-center"
              >
                {loading ? "Setting up..." : "Start Free Trial"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
