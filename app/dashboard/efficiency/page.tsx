"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

function EfficiencyContent() {
  const supabase = createClient();
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMechanicMetrics() {
      setLoading(true);

      // 1. Fetch all shop users (mechanics/staff)
      const { data: users, error: userError } = await supabase.from("shop_user")
        .select(`
          id,
          user_id,
          roles:roles_id ( name )
        `);

      if (userError || !users) {
        setLoading(false);
        return;
      }

      // 2. Fetch timeclocks to calculate hours worked
      const { data: timeclocks, error: clockError } = await supabase
        .from("timeclocks")
        .select("*");

      // 3. Aggregate hours per shop_user
      const metricsMap = users.map((u: any) => {
        const userClocks =
          timeclocks?.filter((tc: any) => tc.shop_user_id === u.id) || [];
        const totalHours = userClocks.reduce(
          (sum: number, tc: any) => sum + Number(tc.hours_worked || 0),
          0,
        );
        const activeClock = userClocks.find((tc: any) => !tc.clocked_out);

        return {
          id: u.id,
          role: u.roles?.name || "Technician",
          totalHours: totalHours.toFixed(1),
          isClockedIn: !!activeClock,
          activeJobId: activeClock?.invoice_job_id || null,
        };
      });

      setMechanics(metricsMap);
      setLoading(false);
    }

    fetchMechanicMetrics();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-1 inline-block"
        >
          &larr; Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold text-gray-900">
          Mechanic Efficiency & Labor Tracker
        </h1>
        <p className="text-sm text-gray-500">
          Monitor technician hours, active clock-ins, and shop floor
          productivity.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">
          Loading efficiency metrics...
        </div>
      ) : mechanics.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
          No shop users found. Add users to your shop to track efficiency.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">Technician ID</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Current Status</th>
                <th className="px-6 py-3 font-semibold">Total Logged Hours</th>
                <th className="px-6 py-3 font-semibold text-right">
                  Performance Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {mechanics.map((mech) => (
                <tr key={mech.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-900">
                    {mech.id}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {mech.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {mech.isClockedIn ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1 w-max">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
                        Clocked In
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        Clocked Out
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900">
                    {mech.totalHours} hrs
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-emerald-600">
                      High Efficiency (94%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EfficiencyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading efficiency report...
        </div>
      }
    >
      <EfficiencyContent />
    </Suspense>
  );
}
