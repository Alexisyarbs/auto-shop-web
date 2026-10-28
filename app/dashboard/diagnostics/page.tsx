"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Car = {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string | null;
  customer_id: string;
  miles: number | null;
};

type DiagnosticItem = {
  id: string;
  category: string;
  name: string;
};

type InspectionResultState = {
  [itemId: string]: {
    grade: "green" | "yellow" | "red";
    mechanic_notes: string;
    media_url?: string;
  };
};

function DiagnosticsWorkspaceContent() {
  const supabase = createClient();
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopUserId, setShopUserId] = useState<string | null>(null);
  const [items, setItems] = useState<DiagnosticItem[]>([]);

  // --- Step 1 Selection State ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [customerCars, setCustomerCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");

  // --- Modals for Quick Creation ---
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [custFormError, setCustFormError] = useState<string | null>(null);

  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState(false);
  const [newCarYear, setNewCarYear] = useState("");
  const [newCarMake, setNewCarMake] = useState("");
  const [newCarModel, setNewCarModel] = useState("");
  const [newCarVin, setNewCarVin] = useState("");
  const [newCarMiles, setNewCarMiles] = useState("");
  const [carFormError, setCarFormError] = useState<string | null>(null);

  // --- Active Inspection State ---
  const [isInspecting, setIsInspecting] = useState(false);
  const [activeDiagnosticId, setActiveDiagnosticId] = useState<string | null>(
    null,
  );
  const [results, setResults] = useState<InspectionResultState>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obdCodes, setObdCodes] = useState("");

  useEffect(() => {
    async function init() {
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (!shopData) return;
      setShopId(shopData.id);

      // Get current auth user mapped to shop_user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: shopUser } = await supabase
          .from("shop_user")
          .select("id")
          .eq("shop_id", shopData.id)
          .eq("user_id", user.id)
          .single();
        if (shopUser) setShopUserId(shopUser.id);
      }

      fetchCustomers(shopData.id);
      fetchItems(shopData.id);
    }
    init();

    function handleClickOutside(event: MouseEvent) {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleFileUpload(
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${shopId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("inspection-media")
      .upload(filePath, file);

    if (uploadError) {
      alert("Error uploading file: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("inspection-media")
      .getPublicUrl(filePath);

    setResults((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], media_url: publicUrlData.publicUrl },
    }));
  }

  async function fetchCustomers(currentShopId: string) {
    const { data } = await supabase
      .from("customer")
      .select("id, name, phone, email")
      .eq("shop_id", currentShopId)
      .order("name");
    if (data) setCustomers(data);
  }

  async function fetchCarsForCustomer(customerId: string) {
    const { data } = await supabase
      .from("car")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (data) setCustomerCars(data);
  }

  async function fetchItems(currentShopId: string) {
    const { data } = await supabase
      .from("diagnostics_item")
      .select("*")
      .eq("shop_id", currentShopId)
      .order("category");
    if (data) {
      setItems(data);
      const initial: InspectionResultState = {};
      data.forEach((i) => {
        initial[i.id] = { grade: "green", mechanic_notes: "" };
      });
      setResults(initial);
    }
  }

  // Handle selecting a customer from dropdown
  function handleSelectCustomer(cust: Customer) {
    setSelectedCustomerId(cust.id);
    setSelectedCustomerName(cust.name);
    setCustomerSearchQuery(cust.name);
    setIsCustomerDropdownOpen(false);
    setSelectedCarId("");
    fetchCarsForCustomer(cust.id);
  }

  // Quick create customer inline
  async function handleQuickCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setCustFormError(null);

    const { data, error } = await supabase
      .from("customer")
      .insert({
        shop_id: shopId,
        name: newCustName,
        phone: newCustPhone || null,
        email: newCustEmail || null,
      })
      .select()
      .single();

    if (error || !data) {
      setCustFormError(error?.message || "Failed to create customer.");
      return;
    }

    // Refresh customers list and select new customer
    await fetchCustomers(shopId);
    handleSelectCustomer(data);
    setIsNewCustModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustEmail("");
  }

  // Quick create car for selected customer inline
  async function handleQuickCreateCar(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !selectedCustomerId) return;
    setCarFormError(null);

    const { data, error } = await supabase
      .from("car")
      .insert({
        shop_id: shopId,
        customer_id: selectedCustomerId,
        year: parseInt(newCarYear),
        make: newCarMake,
        model: newCarModel,
        vin: newCarVin || null,
        miles: newCarMiles ? parseInt(newCarMiles) : null,
        status: "active",
      })
      .select()
      .single();

    if (error || !data) {
      setCarFormError(error?.message || "Failed to create vehicle.");
      return;
    }

    await fetchCarsForCustomer(selectedCustomerId);
    setSelectedCarId(data.id);
    if (data.miles) setCurrentMileage(data.miles.toString());
    setIsNewCarModalOpen(false);
    setNewCarYear("");
    setNewCarMake("");
    setNewCarModel("");
    setNewCarVin("");
    setNewCarMiles("");
  }

  async function handleStartInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !selectedCarId || !selectedCustomerId) return;
    setError(null);

    // 1. Create main diagnostic session row (including obd_codes)
    const { data: diag, error: diagError } = await supabase
      .from("diagnostics")
      .insert({
        shop_id: shopId,
        shop_user_id: shopUserId || null,
        customer_id: selectedCustomerId,
        car_id: selectedCarId,
        vehicle_mileage: currentMileage ? parseInt(currentMileage) : null,
        obd_codes: obdCodes || null, // <--- Added OBD-II codes here
        status: "in_progress",
      })
      .select()
      .single();

    if (diagError || !diag) {
      setError(diagError?.message || "Failed to start inspection.");
      return;
    }

    // 2. Update the car's status to "in_diagnostic"
    const carUpdatePayload: { status: string; miles?: number } = {
      status: "in_diagnostic",
    };
    if (currentMileage) {
      carUpdatePayload.miles = parseInt(currentMileage);
    }

    await supabase.from("car").update(carUpdatePayload).eq("id", selectedCarId);

    setActiveDiagnosticId(diag.id);
    setIsInspecting(true);
  }

  function handleGradeChange(
    itemId: string,
    grade: "green" | "yellow" | "red",
  ) {
    setResults((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], grade },
    }));
  }

  function handleNotesChange(itemId: string, mechanic_notes: string) {
    setResults((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], mechanic_notes },
    }));
  }

  async function handleCompleteInspection() {
    if (!activeDiagnosticId) return;
    setSubmitting(true);
    setError(null);

    const resultsToInsert = Object.keys(results).map((itemId) => ({
      diagnostics_id: activeDiagnosticId,
      diagnostics_item_id: itemId,
      grade: results[itemId].grade,
      mechanic_notes: results[itemId].mechanic_notes || "",
    }));

    const { error: resError } = await supabase
      .from("diagnostics_results")
      .insert(resultsToInsert);

    if (resError) {
      setError(resError.message);
      setSubmitting(false);
      return;
    }

    await supabase
      .from("diagnostics")
      .update({ status: "completed" })
      .eq("id", activeDiagnosticId);

    alert("Inspection saved successfully!");
    setIsInspecting(false);
    setActiveDiagnosticId(null);
    setSubmitting(false);
  }

  const filteredCustomersForDropdown = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearchQuery)) ||
      (c.email &&
        c.email.toLowerCase().includes(customerSearchQuery.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
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
            Digital Vehicle Inspection (DVI)
          </h1>
          <p className="text-sm text-gray-500">
            Run multi-point inspections and grade vehicle health.
          </p>
        </div>
        <a
          href="/dashboard/diagnostics/setup"
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ⚙️ Setup Checkpoints
        </a>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* STEP 1: Select Customer & Car */}
      {!isInspecting ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            Start New Inspection
          </h2>

          <form onSubmit={handleStartInspection} className="space-y-4">
            {/* Searchable Customer Field */}
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-sm font-medium text-gray-700">
                1. Search & Select Customer *
              </label>
              <input
                type="text"
                placeholder="Type customer name, phone, or email..."
                value={customerSearchQuery}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setIsCustomerDropdownOpen(true);
                  if (!e.target.value) {
                    setSelectedCustomerId("");
                    setSelectedCustomerName("");
                    setCustomerCars([]);
                    setSelectedCarId("");
                  }
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />

              {isCustomerDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-52 rounded-md border border-gray-200 overflow-y-auto">
                  <div
                    onClick={() => {
                      setIsCustomerDropdownOpen(false);
                      setIsNewCustModalOpen(true);
                    }}
                    className="p-3 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                  >
                    <span>+ Create New Customer</span>
                  </div>

                  {filteredCustomersForDropdown.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      No matching customers found
                    </div>
                  ) : (
                    filteredCustomersForDropdown.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
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

            {/* Customer's Cars Selection */}
            {selectedCustomerId && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    2. Select Vehicle for {selectedCustomerName} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewCarModalOpen(true)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-blue-600 font-semibold px-2.5 py-1 rounded transition"
                  >
                    + Add New Car
                  </button>
                </div>

                {customerCars.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded flex justify-between items-center">
                    <span>No vehicles registered for this customer yet.</span>
                    <button
                      type="button"
                      onClick={() => setIsNewCarModalOpen(true)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700"
                    >
                      Add Car Now
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCarId}
                    onChange={(e) => {
                      setSelectedCarId(e.target.value);
                      const car = customerCars.find(
                        (c) => c.id === e.target.value,
                      );
                      if (car && car.miles)
                        setCurrentMileage(car.miles.toString());
                    }}
                    className="block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose vehicle...</option>
                    {customerCars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.year} {c.make} {c.model}{" "}
                        {c.vin ? `(VIN: ${c.vin.slice(-6)})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Current Mileage */}
            {selectedCarId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Mileage
                </label>
                <input
                  type="number"
                  placeholder="e.g. 74000"
                  value={currentMileage}
                  onChange={(e) => setCurrentMileage(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {/* OBD-II Trouble Codes Input */}
                {selectedCarId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      OBD-II Trouble Codes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. P0300, P0420 (comma separated)"
                      value={obdCodes}
                      onChange={(e) => setObdCodes(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter diagnostic trouble codes found via scanner.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedCarId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md font-medium text-sm transition disabled:opacity-50"
            >
              Start Inspection Checklist
            </button>
          </form>
        </div>
      ) : (
        /* STEP 2: Active Inspection Checklist Board */
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold uppercase text-blue-600">
                Active Inspection
              </span>
              <h2 className="text-lg font-bold text-blue-900">
                Customer: {selectedCustomerName}{" "}
                {currentMileage
                  ? `• ${Number(currentMileage).toLocaleString()} mi`
                  : ""}
              </h2>
            </div>
            <button
              onClick={() => setIsInspecting(false)}
              className="text-xs text-red-600 font-semibold px-3 py-1.5 bg-white border border-red-200 rounded hover:bg-red-50"
            >
              Cancel Inspection
            </button>
          </div>

          {items.length === 0 ? (
            <div className="bg-white p-8 rounded-lg text-center text-gray-500">
              No inspection checkpoints configured! Go to{" "}
              <a
                href="/dashboard/diagnostics/setup"
                className="text-blue-600 underline"
              >
                Setup Checkpoints
              </a>{" "}
              first.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const currentGrade = results[item.id]?.grade || "green";
                return (
                  <div
                    key={item.id}
                    className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <span className="text-xs uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono mr-2">
                          {item.category}
                        </span>
                        <span className="font-bold text-gray-900 text-base">
                          {item.name}
                        </span>
                      </div>

                      {/* Red / Yellow / Green Grade Toggle Buttons */}
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleGradeChange(item.id, "green")}
                          className={`px-3.5 py-1.5 rounded text-xs font-bold transition ${
                            currentGrade === "green"
                              ? "bg-green-600 text-white shadow"
                              : "bg-gray-100 text-gray-600 hover:bg-green-100"
                          }`}
                        >
                          🟢 Good
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGradeChange(item.id, "yellow")}
                          className={`px-3.5 py-1.5 rounded text-xs font-bold transition ${
                            currentGrade === "yellow"
                              ? "bg-yellow-500 text-white shadow"
                              : "bg-gray-100 text-gray-600 hover:bg-yellow-100"
                          }`}
                        >
                          🟡 Warning
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGradeChange(item.id, "red")}
                          className={`px-3.5 py-1.5 rounded text-xs font-bold transition ${
                            currentGrade === "red"
                              ? "bg-red-600 text-white shadow"
                              : "bg-gray-100 text-gray-600 hover:bg-red-100"
                          }`}
                        >
                          🔴 Urgent
                        </button>
                      </div>
                    </div>

                    {/* Notes & Media Upload */}
                    <div className="flex flex-col md:flex-row gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Add mechanic notes or recommendation..."
                        value={results[item.id]?.mechanic_notes || ""}
                        onChange={(e) =>
                          handleNotesChange(item.id, e.target.value)
                        }
                        className="flex-1 w-full text-sm rounded border border-gray-200 p-2 bg-gray-50 focus:bg-white focus:outline-none"
                      />

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {results[item.id]?.media_url ? (
                          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded border border-green-200">
                            📷 Media Attached ✓
                          </span>
                        ) : (
                          <label className="cursor-pointer text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-2 rounded border border-gray-300 transition flex items-center gap-1">
                            <span>📷 Add Photo/Video</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={(e) => handleFileUpload(item.id, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCompleteInspection}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-sm shadow transition disabled:opacity-50"
                >
                  {submitting
                    ? "Saving Inspection..."
                    : "Complete & Save Inspection"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUICK CREATE CUSTOMER MODAL */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Create New Customer
            </h2>
            {custFormError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {custFormError}
              </div>
            )}

            <form onSubmit={handleQuickCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  placeholder="(555) 000-0000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE CAR MODAL */}
      {isNewCarModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Add Vehicle for {selectedCustomerName}
            </h2>
            {carFormError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {carFormError}
              </div>
            )}

            <form onSubmit={handleQuickCreateCar} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2019"
                    value={newCarYear}
                    onChange={(e) => setNewCarYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Make *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ford"
                    value={newCarMake}
                    onChange={(e) => setNewCarMake(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="F-150"
                    value={newCarModel}
                    onChange={(e) => setNewCarModel(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  VIN
                </label>
                <input
                  type="text"
                  placeholder="Vehicle Identification Number..."
                  value={newCarVin}
                  onChange={(e) => setNewCarVin(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mileage
                </label>
                <input
                  type="number"
                  placeholder="55000"
                  value={newCarMiles}
                  onChange={(e) => setNewCarMiles(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsNewCarModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Save & Select Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading diagnostics workspace...
        </div>
      }
    >
      <DiagnosticsWorkspaceContent />
    </Suspense>
  );
}
