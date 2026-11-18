"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type POItemInput = {
  part_number: string;
  name: string;
  quantity: number;
  unit_cost: number;
};

function PurchaseOrdersContent() {
  const supabase = createClient();
  const [shopId, setShopId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Vendor Form State
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAccount, setVendorAccount] = useState("");

  // PO Form State
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [poItems, setPoItems] = useState<POItemInput[]>([
    { part_number: "", name: "", quantity: 1, unit_cost: 0 },
  ]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (!shopData) return;
      setShopId(shopData.id);

      // Fetch Vendors
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("*")
        .eq("shop_id", shopData.id);
      if (vendorData) setVendors(vendorData);

      // Fetch Purchase Orders with their items and vendor details
      const { data: poData } = await supabase
        .from("purchase_orders")
        .select(
          `
          *,
          vendors:vendor_id ( contact_name, account_number ),
          purchase_order_items (*)
        `,
        )
        .eq("shop_id", shopData.id)
        .order("created_at", { ascending: false });
      if (poData) setPurchaseOrders(poData);

      setLoading(false);
    }
    init();
  }, []);

  function handleAddLineItem() {
    setPoItems([
      ...poItems,
      { part_number: "", name: "", quantity: 1, unit_cost: 0 },
    ]);
  }

  function handleRemoveLineItem(index: number) {
    setPoItems(poItems.filter((_, i) => i !== index));
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !vendorName.trim()) return;

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        shop_id: shopId,
        contact_name: vendorName,
        phone: vendorPhone,
        account_number: vendorAccount,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      alert(`Error adding vendor: ${error.message}`);
    } else if (data) {
      setVendors([...vendors, data]);
      setVendorName("");
      setVendorPhone("");
      setVendorAccount("");
      alert("Vendor added successfully!");
    }
  }

  async function handleAddPO(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !selectedVendorId || poItems.length === 0) return;

    // Calculate total PO cost from items
    const totalCost = poItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_cost),
      0,
    );

    // 1. Insert Parent Purchase Order
    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        shop_id: shopId,
        vendor_id: selectedVendorId,
        part_cost: totalCost, // Storing total sum for quick reference
        tracking_number: trackingNumber || null,
        status: "pending",
      })
      .select()
      .single();

    if (poError || !poData) {
      alert(`Error creating PO: ${poError?.message}`);
      return;
    }

    // 2. Insert Associated Line Items
    const itemsToInsert = poItems.map((item) => ({
      purchase_order_id: poData.id,
      part_number: item.part_number || null,
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unit_cost: Number(item.unit_cost) || 0,
    }));

    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(itemsToInsert);

    if (itemsError) {
      alert(`PO created, but failed to save line items: ${itemsError.message}`);
    } else {
      alert("Purchase order created successfully with all parts!");
      setTrackingNumber("");
      setSelectedVendorId("");
      setPoItems([{ part_number: "", name: "", quantity: 1, unit_cost: 0 }]);
      window.location.reload();
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-1 inline-block"
        >
          &larr; Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold text-gray-950">
          Parts & Purchase Orders
        </h1>
        <p className="text-sm text-gray-500">
          Manage suppliers, track multi-part shipments, and monitor inventory
          costs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ADD VENDOR FORM (1/3 width) */}
        <form
          onSubmit={handleAddVendor}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4 lg:col-span-1"
        >
          <h2 className="text-lg font-bold text-gray-900">Add Parts Vendor</h2>
          <div className="space-y-3">
            <input
              type="text"
              required
              placeholder="Vendor Name (e.g. Worldpac)"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Account Number (Optional)"
              value={vendorAccount}
              onChange={(e) => setVendorAccount(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={vendorPhone}
              onChange={(e) => setVendorPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-lg text-sm shadow transition"
            >
              + Add Vendor
            </button>
          </div>
        </form>

        {/* CREATE MULTI-PART PURCHASE ORDER FORM (2/3 width) */}
        <form
          onSubmit={handleAddPO}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4 lg:col-span-2"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              Create Multi-Part Purchase Order
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              required
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.contact_name}{" "}
                  {v.account_number ? `(Acct: ${v.account_number})` : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Shipment Tracking Number (Optional)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          {/* Line Items Repeater */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Parts Included in Order
              </span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                + Add Another Part
              </button>
            </div>

            {poItems.map((item, index) => (
              <div
                key={index}
                className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border"
              >
                <input
                  type="text"
                  placeholder="Part # / SKU"
                  value={item.part_number}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[index].part_number = e.target.value;
                    setPoItems(updated);
                  }}
                  className="w-28 px-3 py-1.5 border rounded text-xs bg-white font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Part Name / Description"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[index].name = e.target.value;
                    setPoItems(updated);
                  }}
                  className="flex-1 px-3 py-1.5 border rounded text-xs bg-white"
                />
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[index].quantity = parseInt(e.target.value) || 1;
                    setPoItems(updated);
                  }}
                  className="w-16 px-3 py-1.5 border rounded text-xs bg-white"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Unit Cost ($)"
                  value={item.unit_cost}
                  onChange={(e) => {
                    const updated = [...poItems];
                    updated[index].unit_cost = parseFloat(e.target.value) || 0;
                    setPoItems(updated);
                  }}
                  className="w-28 px-3 py-1.5 border rounded text-xs bg-white"
                />
                {poItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    className="text-red-400 hover:text-red-600 font-bold px-2 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow transition"
          >
            Submit Purchase Order
          </button>
        </form>
      </div>

      {/* PURCHASE ORDERS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden space-y-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Active Purchase Orders
          </h2>
          <p className="text-xs text-gray-500">
            Track multi-part shipments and total order expenditures.
          </p>
        </div>

        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-semibold">Vendor</th>
              <th className="px-6 py-3 font-semibold">Parts Included</th>
              <th className="px-6 py-3 font-semibold">Total Cost</th>
              <th className="px-6 py-3 font-semibold">Tracking #</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading purchase orders...
                </td>
              </tr>
            ) : purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No purchase orders logged yet.
                </td>
              </tr>
            ) : (
              purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {po.vendors?.contact_name || "Unknown Vendor"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-700">
                    {po.purchase_order_items &&
                    po.purchase_order_items.length > 0 ? (
                      <ul className="space-y-1">
                        {po.purchase_order_items.map((pi: any) => (
                          <li key={pi.id}>
                            <span className="font-semibold">
                              {pi.quantity}x
                            </span>{" "}
                            {pi.name}{" "}
                            <span className="font-mono text-gray-400">
                              ({pi.part_number || "No SKU"})
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>No line items recorded</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-blue-600">
                    ${Number(po.part_cost).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">
                    {po.tracking_number || "No tracking"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 uppercase">
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">Loading orders...</div>
      }
    >
      <PurchaseOrdersContent />
    </Suspense>
  );
}
