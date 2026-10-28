"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../utils/supabase/client";

type Car = {
  id: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  miles: number | null;
  status: string;
  customer_id: string;
  customer?: {
    name: string;
  };
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export default function CarsPage() {
  const supabase = createClient();
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [miles, setMiles] = useState("");
  const [status, setStatus] = useState("active");
  const [formError, setFormError] = useState<string | null>(null);

  // Searchable Customer Dropdown State
  const [customerId, setCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (shopData) {
        setShopId(shopData.id);
        fetchCars(shopData.id);
        fetchCustomers(shopData.id);
      }
    }
    init();

    // Close customer dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchCars(currentShopId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("car")
      .select(
        `
        *,
        customer:customer_id ( name )
      `,
      )
      .eq("shop_id", currentShopId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCars(data);
    }
    setLoading(false);
  }

  async function fetchCustomers(currentShopId: string) {
    const { data, error } = await supabase
      .from("customer")
      .select("id, name, phone, email")
      .eq("shop_id", currentShopId)
      .order("name");

    if (!error && data) {
      setCustomers(data);
    }
  }

  async function handleAddCar(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    if (!customerId) {
      setFormError("Please select a valid customer owner.");
      return;
    }
    setFormError(null);

    const { error } = await supabase.from("car").insert({
      shop_id: shopId,
      customer_id: customerId,
      vin: vin || null,
      year: parseInt(year),
      make,
      model,
      miles: miles ? parseInt(miles) : null,
      status,
    });

    if (error) {
      setFormError(error.message);
    } else {
      // Reset Form & Close
      setVin("");
      setYear("");
      setMake("");
      setModel("");
      setMiles("");
      setCustomerId("");
      setCustomerSearchQuery("");
      setSelectedCustomerName("");
      setStatus("active");
      setIsModalOpen(false);
      fetchCars(shopId);
    }
  }

  const filteredCars = cars.filter(
    (car) =>
      car.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (car.vin && car.vin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (car.customer?.name &&
        car.customer.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredCustomersForDropdown = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearchQuery)) ||
      (c.email &&
        c.email.toLowerCase().includes(customerSearchQuery.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles (Cars)</h1>
          <p className="text-sm text-gray-500">
            Manage shop vehicles, VINs, and customer associations
          </p>
        </div>
        <div className="flex space-x-3">
          <a
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by make, model, VIN, or owner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cars Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading vehicles...
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No vehicles found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCars.map((car) => (
                <tr key={car.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {car.year} {car.make} {car.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {car.customer?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                    {car.vin || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {car.miles ? `${car.miles.toLocaleString()} mi` : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${car.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {car.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add New Vehicle
            </h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddCar} className="space-y-4">
              {/* Searchable Owner Field */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700">
                  Owner (Customer) *
                </label>
                <input
                  type="text"
                  placeholder="Type customer name to search..."
                  value={customerSearchQuery}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerDropdownOpen(true);
                    if (!e.target.value) setCustomerId("");
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Dropdown Options list */}
                {isCustomerDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md border border-gray-200 overflow-y-auto">
                    {filteredCustomersForDropdown.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        No customers found
                      </div>
                    ) : (
                      filteredCustomersForDropdown.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerSearchQuery(c.name);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-gray-400">
                            {c.phone || c.email}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2018"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Camry"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VIN (Vehicle Identification Number)
                </label>
                <input
                  type="text"
                  placeholder="1FTFW1ED..."
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
                  placeholder="65000"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
