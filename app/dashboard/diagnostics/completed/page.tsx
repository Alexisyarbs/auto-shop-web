"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../utils/supabase/client";

type DiagnosticSession = {
  id: string;
  created_at: string;
  vehicle_mileage: number | null;
  status: string;
  customer?: { id: string; name: string; phone: string };
  car?: { id: string; year: number; make: string; model: string; vin: string };
  diagnostics_results?: {
    id: string;
    grade: string;
    mechanic_notes: string;
    diagnostics_item?: { name: string; category: string };
  }[];
};

export default function CompletedDiagnosticsPage() {
  const supabase = createClient();
  const [diagnostics, setDiagnostics] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompleted() {
      setLoading(true);
      const { data, error } = await supabase
        .from("diagnostics")
        .select(
          `
          *,
          customer:customer_id ( id, name, phone ),
          car:car_id ( id, year, make, model, vin ),
          diagnostics_results (
            id,
            grade,
            mechanic_notes,
            diagnostics_item:diagnostics_item_id ( name, category )
          )
        `,
        )
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setDiagnostics(data);
      }
      setLoading(false);
    }
    fetchCompleted();
  }, []);

  async function handleCreateQuote(diag: DiagnosticSession) {
    // We will build the quote creation page next, but this sets up the navigation/link
    window.location.href = `/dashboard/quotes/new?diagnostic_id=${diag.id}&customer_id=${diag.customer?.id}&car_id=${diag.car?.id}`;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <a
            href="/dashboard/diagnostics"
            className="text-sm text-blue-600 hover:underline mb-1 inline-block"
          >
            &larr; Back to Active Inspections
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
            Completed Inspections
          </h1>
          <p className="text-sm text-gray-500">
            Review completed multi-point inspections and convert findings into
            quotes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">
          Loading completed inspections...
        </div>
      ) : diagnostics.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
          No completed inspections found yet. Finish an inspection on the active
          DVI board to see it here!
        </div>
      ) : (
        <div className="space-y-6">
          {diagnostics.map((diag) => {
            const urgentItems =
              diag.diagnostics_results?.filter(
                (r) => r.grade === "red" || r.grade === "yellow",
              ) || [];

            return (
              <div
                key={diag.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-4 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {diag.car?.year} {diag.car?.make} {diag.car?.model}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Customer:{" "}
                      <span className="font-semibold text-gray-700">
                        {diag.customer?.name}
                      </span>{" "}
                      | Mileage:{" "}
                      {diag.vehicle_mileage
                        ? `${diag.vehicle_mileage.toLocaleString()} mi`
                        : "N/A"}{" "}
                      | Inspected on:{" "}
                      {new Date(diag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreateQuote(diag)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm"
                  >
                    + Create Quote from Inspection
                  </button>
                </div>

                {/* Inspection Findings Summary */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Flagged Items / Recommendations ({urgentItems.length})
                  </h4>
                  {urgentItems.length === 0 ? (
                    <p className="text-sm text-green-600 font-medium">
                      🟢 All inspected points passed with green grades!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {urgentItems.map((result) => (
                        <div
                          key={result.id}
                          className={`p-3 rounded-md border flex items-start space-x-3 ${result.grade === "red" ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}
                        >
                          <span className="text-lg">
                            {result.grade === "red" ? "🔴" : "🟡"}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {result.diagnostics_item?.name}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {result.mechanic_notes || "No notes provided."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
