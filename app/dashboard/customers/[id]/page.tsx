"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../utils/supabase/client";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  shop_id: string;
  created_at: string;
};

type Car = {
  id: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  miles: number | null;
  status: string;
};

type Invoice = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

type Quote = {
  id: string;
  overall_status: string;
  created_at: string;
};

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Car Modal State
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [miles, setMiles] = useState("");
  const [carError, setCarError] = useState<string | null>(null);

  // Edit Car Modal State
  const [isEditCarModalOpen, setIsEditCarModalOpen] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editVin, setEditVin] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editMiles, setEditMiles] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editCarError, setEditCarError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData(customerId);
    }
  }, [customerId]);

  async function fetchCustomerData(id: string) {
    setLoading(true);

    // 1. Fetch Customer Details
    const { data: custData, error: custError } = await supabase
      .from("customer")
      .select("*")
      .eq("id", id)
      .single();

    if (custError || !custData) {
      setLoading(false);
      return;
    }
    setCustomer(custData);

    // 2. Fetch Cars connected to this customer
    const { data: carData } = await supabase
      .from("car")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (carData) setCars(carData);

    // 3. Fetch Invoices connected to this customer
    const { data: invData } = await supabase
      .from("invoices")
      .select("id, total, status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (invData) setInvoices(invData);

    // 4. Fetch Quotes connected to this customer
    const { data: quoteData } = await supabase
      .from("quotes")
      .select("id, overall_status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (quoteData) setQuotes(quoteData);

    setLoading(false);
  }

  async function handleAddCar(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setCarError(null);

    const { error } = await supabase.from("car").insert({
      shop_id: customer.shop_id,
      customer_id: customer.id,
      vin: vin || null,
      year: parseInt(year),
      make,
      model,
      miles: miles ? parseInt(miles) : null,
      status: "active",
    });

    if (error) {
      setCarError(error.message);
    } else {
      setVin("");
      setYear("");
      setMake("");
      setModel("");
      setMiles("");
      setIsCarModalOpen(false);
      fetchCustomerData(customer.id);
    }
  }

  function openEditCarModal(car: Car) {
    setEditingCarId(car.id);
    setEditVin(car.vin || "");
    setEditYear(car.year.toString());
    setEditMake(car.make);
    setEditModel(car.model);
    setEditMiles(car.miles !== null ? car.miles.toString() : "");
    setEditStatus(car.status);
    setEditCarError(null);
    setIsEditCarModalOpen(true);
  }

  async function handleUpdateCar(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCarId || !customer) return;
    setEditCarError(null);

    const { error } = await supabase
      .from("car")
      .update({
        vin: editVin || null,
        year: parseInt(editYear),
        make: editMake,
        model: editModel,
        miles: editMiles ? parseInt(editMiles) : null,
        status: editStatus,
      })
      .eq("id", editingCarId);

    if (error) {
      setEditCarError(error.message);
    } else {
      setIsEditCarModalOpen(false);
      setEditingCarId(null);
      fetchCustomerData(customer.id);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading customer profile...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-800">Customer not found</h2>
        <a
          href="/dashboard/customers"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          &larr; Back to Customers Directory
        </a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Navigation / Header */}
      <div className="flex justify-between items-center">
        <div>
          <a
            href="/dashboard/customers"
            className="text-sm text-blue-600 hover:underline mb-1 inline-block"
          >
            &larr; Back to Customers
          </a>
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
        </div>
        <div className="space-x-3">
          <button
            onClick={() => setIsCarModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition"
          >
            + Add Vehicle to Customer
          </button>
        </div>
      </div>

      {/* Grid: Contact Info & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Contact Information
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400 block text-xs uppercase tracking-wider">
                Phone
              </span>
              <span className="font-medium text-gray-800">
                {customer.phone || "Not provided"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase tracking-wider">
                Email
              </span>
              <span className="font-medium text-gray-800">
                {customer.email || "Not provided"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase tracking-wider">
                Customer Since
              </span>
              <span className="font-medium text-gray-800">
                {new Date(customer.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Connected Vehicles Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Connected Vehicles ({cars.length})
            </h2>
          </div>
          {cars.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No vehicles registered for this customer yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {cars.map((car) => (
                <div
                  key={car.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {car.year} {car.make} {car.model}
                    </p>
                    <p className="text-xs font-mono text-gray-500">
                      VIN: {car.vin || "—"} |{" "}
                      {car.miles
                        ? `${car.miles.toLocaleString()} mi`
                        : "Mileage N/A"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${car.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {car.status}
                    </span>
                    <button
                      onClick={() => openEditCarModal(car)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Sections: Quotes & Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quotes History */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Quotes History
          </h2>
          {quotes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No quotes generated yet. (Phase 2 feature)
            </p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">
                    Quote #{q.id.slice(0, 8)}
                  </span>
                  <span className="text-xs uppercase bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-semibold">
                    {q.overall_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices History */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Invoices History
          </h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">
              No invoices generated yet. (Phase 2 feature)
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div>
                    <span className="text-sm font-medium block">
                      Invoice #{inv.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ${inv.total.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs uppercase bg-gray-200 text-gray-800 px-2 py-1 rounded font-semibold">
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {isCarModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Add Vehicle for {customer.name}
            </h2>
            {carError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {carError}
              </div>
            )}

            <form onSubmit={handleAddCar} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2020"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Honda"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Civic"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VIN
                </label>
                <input
                  type="text"
                  placeholder="Vehicle Identification Number"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mileage
                </label>
                <input
                  type="number"
                  placeholder="45000"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCarModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {isEditCarModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Edit Vehicle Details
            </h2>
            {editCarError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {editCarError}
              </div>
            )}

            <form onSubmit={handleUpdateCar} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMake}
                    onChange={(e) => setEditMake(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VIN (Vehicle Identification Number)
                </label>
                <input
                  type="text"
                  placeholder="Enter VIN..."
                  value={editVin}
                  onChange={(e) => setEditVin(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mileage
                </label>
                <input
                  type="number"
                  placeholder="Enter current mileage..."
                  value={editMiles}
                  onChange={(e) => setEditMiles(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditCarModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Update Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
