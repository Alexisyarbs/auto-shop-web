"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shopName, setShopName] = useState<string>("Loading shop...");

  useEffect(() => {
    async function fetchShop() {
      const { data, error } = await supabase
        .from("shop")
        .select("shop_name")
        .limit(1)
        .single();
      if (data) {
        setShopName(data.shop_name);
      } else {
        setShopName("My Auto Shop");
      }
    }
    fetchShop();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
              Active Shop
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {shopName}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Log Out
          </button>
        </div>

        {/* Quick Access Navigation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Development Navigation
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Use these quick links to jump straight to the modules you're
            actively building out:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customers Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">👥 Customers</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add, edit, and search client records.
                </p>
              </div>
              <a
                href="/dashboard/customers"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                Open Customers
              </a>
            </div>

            {/* Cars Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  🚗 Cars / Vehicles
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage vehicles, VINs, and mileage.
                </p>
              </div>
              <a
                href="/dashboard/cars"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                Open Cars
              </a>
            </div>

            {/* Canned Jobs Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">🛠️ Canned Jobs</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Setup templates for standard services.
                </p>
              </div>
              <a
                href="/dashboard/canned-jobs"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                Open Canned Jobs
              </a>
            </div>

            {/* Diagnostics / DVI Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  🔍 Inspections (DVI)
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Run active vehicle diagnostic checks.
                </p>
              </div>
              <a
                href="/dashboard/diagnostics"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                Open Diagnostics
              </a>
            </div>

            {/* Diagnostics Setup Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  ⚙️ Inspection Setup
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your multi-point check items.
                </p>
              </div>
              <a
                href="/dashboard/diagnostics/setup"
                className="mt-4 inline-block text-center bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium py-2 px-4 rounded transition"
              >
                Setup Checkpoints
              </a>
            </div>
            {/* Completed Inspections Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  📋 Completed Inspections
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Review finished DVI results & convert to quotes.
                </p>
              </div>
              <a
                href="/dashboard/diagnostics/completed"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                View Completed DVI
              </a>
            </div>
            {/* Quotes & Estimates Card */}
            <div className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 transition flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  💵 Estimates & Quotes
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View all customer quotes, approvals, and re-send text links.
                </p>
              </div>
              <a
                href="/dashboard/quotes"
                className="mt-4 inline-block text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition"
              >
                View All Quotes
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
