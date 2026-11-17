"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";
import { inviteEmployee } from "./actions";

function EmployeesContent() {
  const supabase = createClient();
  const [shopId, setShopId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Form State
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);

  // New Role Form State
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [canManageEmployees, setCanManageEmployees] = useState(false);
  const [canCreateQuotes, setCanCreateQuotes] = useState(false);
  const [canEditInvoices, setCanEditInvoices] = useState(false);
  const [canMessageCustomers, setCanMessageCustomers] = useState(false);
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [canViewFinancials, setCanViewFinancials] = useState(false);

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

      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .eq("shop_id", shopData.id);
      if (rolesData) setRoles(rolesData);

      const { data: staffData } = await supabase
        .from("shop_user")
        .select(
          `
          id,
          user_id,
          name,
          phone,
          created_at,
          roles:roles_id ( name, description )
        `,
        )
        .eq("shop_id", shopData.id);

      if (staffData) setStaffList(staffData);
      setLoading(false);
    }
    init();
  }, []);

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !inviteEmail || !inviteRoleId || !inviteName) return;
    setInviting(true);

    const formData = new FormData();
    formData.append("name", inviteName);
    formData.append("email", inviteEmail);
    formData.append("phone", invitePhone);
    formData.append("role_id", inviteRoleId);
    formData.append("shop_id", shopId);

    const result = await inviteEmployee(formData);
    setInviting(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert("Invitation sent successfully!");
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
      setInviteRoleId("");
      window.location.reload();
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || !roleName.trim()) return;

    const { data, error } = await supabase
      .from("roles")
      .insert({
        shop_id: shopId,
        name: roleName,
        description: roleDesc,
        can_manage_employees: canManageEmployees,
        can_create_quotes: canCreateQuotes,
        can_edit_invoices: canEditInvoices,
        can_message_customers: canMessageCustomers,
        can_delete_records: canDeleteRecords,
        can_view_dashboard_financials: canViewFinancials,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating role:", error);
      alert("Failed to create role.");
    } else if (data) {
      setRoles([...roles, data]);
      setRoleName("");
      setRoleDesc("");
      setCanManageEmployees(false);
      setCanCreateQuotes(false);
      setCanEditInvoices(false);
      setCanMessageCustomers(false);
      setCanDeleteRecords(false);
      setCanViewFinancials(false);
      alert("Role created successfully!");
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div>
        <a
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline mb-1 inline-block"
        >
          &larr; Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold text-gray-950">
          Shop Staff & Role Permissions
        </h1>
        <p className="text-sm text-gray-500">
          Invite new team members, manage roles, and review security access.
        </p>
      </div>

      {/* SECTION 1: Invite Staff Member Form */}
      <form
        onSubmit={handleInviteSubmit}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Invite New Staff Member
          </h2>
          <p className="text-xs text-gray-500">
            Send an email invitation allowing them to create their password and
            join your shop.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            required
            placeholder="Full Name (e.g. John Doe)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
          <input
            type="email"
            required
            placeholder="Email Address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Phone Number (Optional)"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
          <select
            required
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          >
            <option value="">-- Select Role --</option>
            {roles.map((r) => (
              <option key={r.roles_id} value={r.roles_id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={inviting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow transition disabled:opacity-50"
        >
          {inviting ? "Sending Invite..." : "📧 Send Email Invitation"}
        </button>
      </form>

      {/* SECTION 2: Active Shop Users Roster */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden space-y-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Active Shop Users</h2>
          <p className="text-xs text-gray-500">
            Staff members tied to your shop.
          </p>
        </div>

        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Phone</th>
              <th className="px-6 py-3 font-semibold">Assigned Role</th>
              <th className="px-6 py-3 font-semibold">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  Loading staff...
                </td>
              </tr>
            ) : staffList.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No active shop users found.
                </td>
              </tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {staff.name || "Unnamed Staff"}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {staff.phone || "No phone"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {staff.roles?.name || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {new Date(staff.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION 3: Existing Roles & Permissions Review */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Existing Shop Roles & Permissions
          </h2>
          <p className="text-xs text-gray-500">
            Review all created roles and what access levels they grant.
          </p>
        </div>

        {roles.length === 0 ? (
          <p className="text-sm text-gray-500">No custom roles created yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => (
              <div
                key={role.roles_id}
                className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
              >
                <div>
                  <h3 className="font-bold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500">
                    {role.description || "No description provided."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-200">
                  {role.can_manage_employees && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                      Manage Employees
                    </span>
                  )}
                  {role.can_create_quotes && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                      Quotes
                    </span>
                  )}
                  {role.can_edit_invoices && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      Invoices
                    </span>
                  )}
                  {role.can_message_customers && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                      SMS Customers
                    </span>
                  )}
                  {role.can_delete_records && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                      Delete Records
                    </span>
                  )}
                  {role.can_view_dashboard_financials && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      Financials
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: Create New Role Form */}
      <form
        onSubmit={handleCreateRole}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Create New Staff Role
          </h2>
          <p className="text-xs text-gray-500">
            Define custom permissions for mechanics, advisors, or managers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            required
            placeholder="Role Name (e.g., Senior Technician)"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Short description..."
            value={roleDesc}
            onChange={(e) => setRoleDesc(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canManageEmployees}
              onChange={(e) => setCanManageEmployees(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>Manage Employees</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canCreateQuotes}
              onChange={(e) => setCanCreateQuotes(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>Create & Edit Quotes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canEditInvoices}
              onChange={(e) => setCanEditInvoices(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>Edit Invoices</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canMessageCustomers}
              onChange={(e) => setCanMessageCustomers(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>Message Customers (SMS)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canDeleteRecords}
              onChange={(e) => setCanDeleteRecords(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>Delete Records</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={canViewFinancials}
              onChange={(e) => setCanViewFinancials(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>View Financials</span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow transition"
        >
          Save New Role
        </button>
      </form>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading staff management...
        </div>
      }
    >
      <EmployeesContent />
    </Suspense>
  );
}
