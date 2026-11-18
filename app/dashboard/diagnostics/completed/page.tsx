"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../../utils/supabase/client";
import { parseAndFetchObdCodes } from "@/utils/obdFetcher";

type DiagnosticSession = {
  id: string;
  created_at: string;
  vehicle_mileage: number | null;
  obd_codes: string | null; // 👈 Added OBD-II string column
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

function ObdCodesBadge({ rawCodes }: { rawCodes: string | null }) {
  const [decoded, setDecoded] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawCodes) return;
    async function loadCodes() {
      setLoading(true);
      const results = await parseAndFetchObdCodes(rawCodes || "");
      setDecoded(results);
      setLoading(false);
    }
    loadCodes();
  }, [rawCodes]);

  if (!rawCodes) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-3 mt-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Scanned OBD-II Trouble Codes
        </h4>
        <span className="text-[10px] text-gray-400">Powered by AutoTools</span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 animate-pulse">
          Translating trouble codes...
        </p>
      ) : (
        <div className="space-y-2">
          {decoded.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-3 rounded border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                  {item.code}
                </span>
                <span className="text-gray-900 font-semibold">
                  {item.meaning}
                </span>
              </div>
              {item.system && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded self-start sm:self-auto">
                  {item.system}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompletedDiagnosticsContent() {
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

                {/* OBD-II Trouble Codes Translated Section */}
                <ObdCodesBadge rawCodes={diag.obd_codes} />

                {/* Inspection Findings Summary */}
                <div className="pt-2">
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

export default function CompletedDiagnosticsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <CompletedDiagnosticsContent />
    </Suspense>
  );
}
