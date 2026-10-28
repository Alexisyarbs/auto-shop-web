"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../../utils/supabase/client";

type DiagnosticItem = {
  id: string;
  category: string;
  name: string;
};

function DiagnosticsSetupContent() {
  const supabase = createClient();
  const [items, setItems] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState("Brakes & Suspension");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (shopData) {
        setShopId(shopData.id);
        fetchItems(shopData.id);
      }
    }
    init();
  }, []);

  async function fetchItems(currentShopId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("diagnostics_item")
      .select("*")
      .eq("shop_id", currentShopId)
      .order("category");

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setError(null);

    const { error: insertError } = await supabase
      .from("diagnostics_item")
      .insert({
        shop_id: shopId,
        category,
        name,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setName("");
      fetchItems(shopId);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Remove this checkpoint from your inspection template?"))
      return;
    const { error } = await supabase
      .from("diagnostics_item")
      .delete()
      .eq("id", id);
    if (!error && shopId) {
      fetchItems(shopId);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
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
            Diagnostic Checkpoints Setup
          </h1>
          <p className="text-sm text-gray-500">
            Configure standard inspection items your mechanics check on every
            multi-point inspection.
          </p>
        </div>
        <a
          href="/dashboard/diagnostics"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition"
        >
          Go to Active Inspections &rarr;
        </a>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Add New Checkpoint Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Add Inspection Checkpoint
        </h2>
        <form
          onSubmit={handleAddItem}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Brakes, Fluids, Tires"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Checkpoint Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Front Brake Pad Thickness"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium text-sm transition h-[38px]"
          >
            + Add Checkpoint
          </button>
        </form>
      </div>

      {/* Checkpoints List Grouped/Displayed */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Current Inspection Template ({items.length})
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading checkpoints...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No checkpoints created yet. Add some above!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <span className="text-xs uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono mr-3">
                    {item.category}
                  </span>
                  <span className="font-medium text-gray-800">{item.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagnosticsSetupPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <DiagnosticsSetupContent />
    </Suspense>
  );
}
