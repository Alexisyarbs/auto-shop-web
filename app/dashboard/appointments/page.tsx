"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

function AppointmentsContent() {
  const supabase = createClient();
  const [shopId, setShopId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [appointmentType, setAppointmentType] = useState(
    "Diagnostics / Inspection",
  );
  const [scheduledStart, setScheduledStart] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // New Customer & Vehicle Toggle State
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCarYear, setNewCarYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [newCarMake, setNewCarMake] = useState("");
  const [newCarModel, setNewCarModel] = useState("");

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

      const { data: custData } = await supabase
        .from("customer")
        .select("id, name, phone, email")
        .eq("shop_id", shopData.id);
      if (custData) setCustomers(custData);

      const { data: carData } = await supabase
        .from("car")
        .select("id, year, make, model, customer_id")
        .eq("shop_id", shopData.id);
      if (carData) setCars(carData);

      const { data: apptData } = await supabase
        .from("appointments")
        .select(
          `
          *,
          customer:customer_id ( name, phone ),
          car:car_id ( year, make, model )
        `,
        )
        .eq("shop_id", shopData.id)
        .order("scheduled_start", { ascending: true });
      if (apptData) setAppointments(apptData);

      setLoading(false);
    }
    init();
  }, []);

  // Filter customers as user types name or phone number
  const filteredCustomers =
    customerSearch.trim() === ""
      ? []
      : customers.filter(
          (c) =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.phone && c.phone.includes(customerSearch)),
        );

  // Filter cars for the selected customer
  const filteredCars = selectedCustomer
    ? cars.filter((c) => c.customer_id === selectedCustomer.id)
    : [];

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !scheduledStart) return;

    let customerIdToUse = selectedCustomer?.id;
    let carIdToUse = selectedCarId;

    if (isNewCustomer) {
      if (!newCustName.trim() || !newCarMake.trim() || !newCarModel.trim()) {
        alert("Please provide Customer Name, Vehicle Make, and Model.");
        return;
      }

      const { data: newCust, error: custError } = await supabase
        .from("customer")
        .insert({
          shop_id: shopId,
          name: newCustName,
          phone: newCustPhone || null,
          email: newCustEmail || null,
        })
        .select()
        .single();

      if (custError || !newCust) {
        alert(`Error creating customer: ${custError?.message}`);
        return;
      }
      customerIdToUse = newCust.id;

      const { data: newCar, error: carError } = await supabase
        .from("car")
        .insert({
          shop_id: shopId,
          customer_id: newCust.id,
          year: parseInt(newCarYear) || new Date().getFullYear(),
          make: newCarMake,
          model: newCarModel,
          status: "scheduled",
        })
        .select()
        .single();

      if (carError || !newCar) {
        alert(
          `Customer created, but failed to save vehicle: ${carError?.message}`,
        );
        return;
      }
      carIdToUse = newCar.id;
    }

    if (!customerIdToUse || !carIdToUse) {
      alert("Please select or register a customer and vehicle.");
      return;
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        shop_id: shopId,
        customer_id: customerIdToUse,
        car_id: carIdToUse,
        appointment_type: appointmentType,
        scheduled_start: new Date(scheduledStart).toISOString(),
        customer_notes: customerNotes || null,
        status: "pending",
      })
      .select(
        `
        *,
        customer:customer_id ( name, phone ),
        car:car_id ( year, make, model )
      `,
      )
      .single();

    if (error) {
      alert(`Error creating appointment: ${error.message}`);
    } else if (data) {
      setAppointments([...appointments, data]);
      setCustomerSearch("");
      setSelectedCustomer(null);
      setSelectedCarId("");
      setScheduledStart("");
      setCustomerNotes("");
      setIsNewCustomer(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setNewCarMake("");
      setNewCarModel("");
      alert("Appointment booked successfully!");
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
          Shop Appointments & Schedule
        </h1>
        <p className="text-sm text-gray-500">
          Book customer drop-offs and manage shop capacity.
        </p>
      </div>

      <form
        onSubmit={handleCreateAppointment}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6"
      >
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Schedule New Appointment
          </h2>
          <button
            type="button"
            onClick={() => setIsNewCustomer(!isNewCustomer)}
            className="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition"
          >
            {isNewCustomer
              ? "← Back to Customer Search"
              : "+ Register New Customer & Car"}
          </button>
        </div>

        {!isNewCustomer ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
            {/* SEARCH-AS-YOU-TYPE CUSTOMER INPUT */}
            <div className="space-y-1 relative">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                Customer (Search by Name or Phone)
              </label>
              {selectedCustomer ? (
                <div className="flex justify-between items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div>
                    <span className="font-bold text-blue-900">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-xs text-blue-600 ml-2">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedCarId("");
                    }}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type name or phone number..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
                  />
                  {/* LIVE DROPDOWN RESULTS */}
                  {filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerSearch("");
                          }}
                          className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-none text-sm flex justify-between items-center"
                        >
                          <span className="font-bold text-gray-900">
                            {cust.name}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {cust.phone || "No phone"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VEHICLE SELECTOR */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                Select Vehicle
              </label>
              <select
                required
                value={selectedCarId}
                onChange={(e) => setSelectedCarId(e.target.value)}
                disabled={!selectedCustomer}
                className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {selectedCustomer
                    ? "-- Choose Vehicle --"
                    : "Select customer first..."}
                </option>
                {filteredCars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.year} {car.make} {car.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* NEW CUSTOMER & VEHICLE ON-THE-FLY FORM */
          <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
              New Customer & Vehicle Registration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                placeholder="Customer Full Name"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address (Optional)"
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <input
                type="number"
                placeholder="Year (e.g. 2020)"
                value={newCarYear}
                onChange={(e) => setNewCarYear(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Make (e.g. Honda)"
                value={newCarMake}
                onChange={(e) => setNewCarMake(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Model (e.g. Civic)"
                value={newCarModel}
                onChange={(e) => setNewCarModel(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* APPOINTMENT DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Service Type
            </label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="Diagnostics / Inspection">
                Diagnostics / Inspection
              </option>
              <option value="General Repair">General Repair</option>
              <option value="Oil Change & Maintenance">
                Oil Change & Maintenance
              </option>
              <option value="Tires & Alignment">Tires & Alignment</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase">
              Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Customer Notes / Reported Issues
          </label>
          <input
            type="text"
            placeholder="e.g. Making a squeaking noise when braking..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm shadow transition"
        >
          {isNewCustomer
            ? "Register Customer & Schedule Appointment"
            : "Schedule Appointment"}
        </button>
      </form>

      {/* APPOINTMENTS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden space-y-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Upcoming Shop Schedule
          </h2>
          <p className="text-xs text-gray-500">
            All scheduled customer drop-offs and appointments.
          </p>
        </div>

        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-semibold">Scheduled Date & Time</th>
              <th className="px-6 py-3 font-semibold">Customer & Vehicle</th>
              <th className="px-6 py-3 font-semibold">Service Type</th>
              <th className="px-6 py-3 font-semibold">Notes</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Loading schedule...
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No appointments scheduled yet.
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-blue-600">
                    {new Date(appt.scheduled_start).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">
                      {appt.customer?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {appt.car?.year} {appt.car?.make} {appt.car?.model}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {appt.appointment_type || "General Service"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate">
                    {appt.customer_notes || "No notes"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 uppercase">
                      {appt.status}
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

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading appointments...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
