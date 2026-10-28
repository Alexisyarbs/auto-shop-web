"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

function CustomersContent() {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New Customer Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // For now, assume we grab the first shop ID or store active shop context.
  // (In a multi-shop app, you'd fetch this from user session/context)
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // 1. Fetch the user's shop (simplified for single shop or primary shop link)
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (shopData) {
        setShopId(shopData.id);
        fetchCustomers(shopData.id);
      }
    }
    init();
  }, []);

  async function fetchCustomers(currentShopId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer")
      .select("*")
      .eq("shop_id", currentShopId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setFormError(null);

    const { error } = await supabase.from("customer").insert({
      shop_id: shopId,
      name,
      phone,
      email,
    });

    if (error) {
      setFormError(error.message);
    } else {
      // Reset & Refresh
      setName("");
      setPhone("");
      setEmail("");
      setIsModalOpen(false);
      fetchCustomers(shopId);
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">
            Manage your shop's client directory
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition"
        >
          + Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading customers...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No customers found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {customer.phone || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {customer.email || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/dashboard/customers/${customer.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Profile
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add New Customer
            </h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <CustomersContent />
    </Suspense>
  );
}
