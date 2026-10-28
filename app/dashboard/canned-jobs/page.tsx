"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "../../../utils/supabase/client";

type CannedJobItem = {
  id?: string;
  item_type: string;
  name: string;
  default_quantity: number | "";
  default_unit_price: number | "";
};

type CannedJob = {
  id: string;
  name: string;
  description: string | null;
  canned_jobs_items?: CannedJobItem[];
};

function CannedJobsContent() {
  const supabase = createClient();
  const [cannedJobs, setCannedJobs] = useState<CannedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobName, setJobName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [items, setItems] = useState<CannedJobItem[]>([
    {
      item_type: "labor",
      name: "Diagnostic / Labor",
      default_quantity: 1,
      default_unit_price: "",
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobName, setEditJobName] = useState("");
  const [editJobDescription, setEditJobDescription] = useState("");
  const [editItems, setEditItems] = useState<CannedJobItem[]>([]);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: shopData } = await supabase
        .from("shop")
        .select("id")
        .limit(1)
        .single();
      if (shopData) {
        setShopId(shopData.id);
        fetchCannedJobs(shopData.id);
      }
    }
    init();
  }, []);

  async function fetchCannedJobs(currentShopId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("canned_jobs")
      .select(
        `
        *,
        canned_jobs_items (*)
      `,
      )
      .eq("shop_id", currentShopId)
      .order("name");

    if (!error && data) {
      setCannedJobs(data);
    }
    setLoading(false);
  }

  // --- Create Handlers ---
  function handleAddItemRow() {
    setItems([
      ...items,
      {
        item_type: "part",
        name: "",
        default_quantity: 1,
        default_unit_price: "",
      },
    ]);
  }

  function handleRemoveItemRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleItemChange(
    index: number,
    field: keyof CannedJobItem,
    value: any,
  ) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleCreateCannedJob(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setFormError(null);

    const { data: newJob, error: jobError } = await supabase
      .from("canned_jobs")
      .insert({
        shop_id: shopId,
        name: jobName,
        description: jobDescription || null,
      })
      .select()
      .single();

    if (jobError || !newJob) {
      setFormError(jobError?.message || "Failed to create canned job.");
      return;
    }

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        canned_jobs_id: newJob.id,
        item_type: item.item_type,
        name: item.name,
        default_quantity: Number(item.default_quantity) || 1,
        default_unit_price: Number(item.default_unit_price) || 0,
      }));

      const { error: itemsError } = await supabase
        .from("canned_jobs_items")
        .insert(itemsToInsert);
      if (itemsError) {
        setFormError(itemsError.message);
        return;
      }
    }

    setJobName("");
    setJobDescription("");
    setItems([
      {
        item_type: "labor",
        name: "Labor",
        default_quantity: 1,
        default_unit_price: "",
      },
    ]);
    setIsModalOpen(false);
    fetchCannedJobs(shopId);
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm("Are you sure you want to delete this canned job template?"))
      return;

    // 1. Delete associated items first to satisfy foreign key constraint
    const { error: itemsDeleteError } = await supabase
      .from("canned_jobs_items")
      .delete()
      .eq("canned_jobs_id", jobId);

    if (itemsDeleteError) {
      alert("Error deleting canned job items: " + itemsDeleteError.message);
      return;
    }

    // 2. Now delete the canned job itself
    const { error } = await supabase
      .from("canned_jobs")
      .delete()
      .eq("id", jobId);
    if (error) {
      alert("Error deleting canned job: " + error.message);
    } else if (shopId) {
      fetchCannedJobs(shopId);
    }
  }

  function openEditModal(job: CannedJob) {
    setEditingJobId(job.id);
    setEditJobName(job.name);
    setEditJobDescription(job.description || "");
    setEditItems(
      job.canned_jobs_items && job.canned_jobs_items.length > 0
        ? job.canned_jobs_items.map((i) => ({ ...i }))
        : [
            {
              item_type: "labor",
              name: "Labor",
              default_quantity: 1,
              default_unit_price: "",
            },
          ],
    );
    setEditFormError(null);
    setIsEditModalOpen(true);
  }

  function handleEditAddItemRow() {
    setEditItems([
      ...editItems,
      {
        item_type: "part",
        name: "",
        default_quantity: 1,
        default_unit_price: "",
      },
    ]);
  }

  function handleEditRemoveItemRow(index: number) {
    setEditItems(editItems.filter((_, i) => i !== index));
  }

  function handleEditItemChange(
    index: number,
    field: keyof CannedJobItem,
    value: any,
  ) {
    const updated = [...editItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditItems(updated);
  }

  async function handleUpdateCannedJob(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJobId || !shopId) return;
    setEditFormError(null);

    // 1. Update Job info
    const { error: updateError } = await supabase
      .from("canned_jobs")
      .update({
        name: editJobName,
        description: editJobDescription || null,
      })
      .eq("id", editingJobId);

    if (updateError) {
      setEditFormError(updateError.message);
      return;
    }

    // 2. Refresh items: delete existing items for this job and re-insert current ones cleanly
    await supabase
      .from("canned_jobs_items")
      .delete()
      .eq("canned_jobs_id", editingJobId);

    if (editItems.length > 0) {
      const itemsToInsert = editItems.map((item) => ({
        canned_jobs_id: editingJobId,
        item_type: item.item_type,
        name: item.name,
        default_quantity: Number(item.default_quantity) || 1,
        default_unit_price: Number(item.default_unit_price) || 0,
      }));

      const { error: itemsError } = await supabase
        .from("canned_jobs_items")
        .insert(itemsToInsert);
      if (itemsError) {
        setEditFormError(itemsError.message);
        return;
      }
    }

    setIsEditModalOpen(false);
    setEditingJobId(null);
    fetchCannedJobs(shopId);
  }

  const filteredJobs = cannedJobs.filter(
    (job) =>
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description &&
        job.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canned Jobs</h1>
          <p className="text-sm text-gray-500">
            Create reusable job templates for faster quoting and invoicing
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
            + Create Canned Job
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search canned jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Canned Jobs List / Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">
          Loading canned jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500">
          No canned jobs found. Create your first service template!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => {
            const jobTotal =
              job.canned_jobs_items?.reduce(
                (sum, item) =>
                  sum +
                  Number(item.default_quantity) *
                    Number(item.default_unit_price),
                0,
              ) || 0;

            return (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {job.name}
                    </h3>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                      Est. ${jobTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {job.description || "No description provided."}
                  </p>

                  {/* Items List Inside Template */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Default Line Items
                    </span>
                    {job.canned_jobs_items &&
                    job.canned_jobs_items.length > 0 ? (
                      job.canned_jobs_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm py-1"
                        >
                          <span className="text-gray-700">
                            <span className="text-xs uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-2 font-mono">
                              {item.item_type}
                            </span>
                            {item.name}{" "}
                            <span className="text-gray-400">
                              ({item.default_quantity}x)
                            </span>
                          </span>
                          <span className="font-medium text-gray-900">
                            $
                            {(
                              Number(item.default_quantity) *
                              Number(item.default_unit_price)
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No items attached.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-gray-100 mt-6 pt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => openEditModal(job)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-3 py-1.5 border border-red-200 bg-red-50 rounded text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Canned Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create Canned Job Template
            </h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCannedJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Synthetic Oil Change"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Includes 5qts synthetic oil and premium filter replacement."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Line Items Builder Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Default Items & Parts
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-2.5 py-1.5 rounded transition"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-center bg-gray-50 p-3 rounded-md border border-gray-200"
                    >
                      <select
                        value={item.item_type}
                        onChange={(e) =>
                          handleItemChange(index, "item_type", e.target.value)
                        }
                        className="rounded border border-gray-300 p-1.5 text-xs bg-white"
                      >
                        <option value="part">Part</option>
                        <option value="labor">Labor</option>
                        <option value="fee">Fee</option>
                      </select>

                      <input
                        type="text"
                        required
                        placeholder="Item name (e.g. 5W-30 Oil)"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index, "name", e.target.value)
                        }
                        className="flex-1 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={item.default_quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "default_quantity",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                          )
                        }
                        className="w-16 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Price ($)"
                        value={item.default_unit_price}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "default_unit_price",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                          )
                        }
                        className="w-24 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Save Canned Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Canned Job Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Edit Canned Job Template
            </h2>
            {editFormError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleUpdateCannedJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={editJobName}
                  onChange={(e) => setEditJobName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editJobDescription}
                  onChange={(e) => setEditJobDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Edit Line Items Builder Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Default Items & Parts
                  </h3>
                  <button
                    type="button"
                    onClick={handleEditAddItemRow}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-2.5 py-1.5 rounded transition"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {editItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-center bg-gray-50 p-3 rounded-md border border-gray-200"
                    >
                      <select
                        value={item.item_type}
                        onChange={(e) =>
                          handleEditItemChange(
                            index,
                            "item_type",
                            e.target.value,
                          )
                        }
                        className="rounded border border-gray-300 p-1.5 text-xs bg-white"
                      >
                        <option value="part">Part</option>
                        <option value="labor">Labor</option>
                        <option value="fee">Fee</option>
                      </select>

                      <input
                        type="text"
                        required
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) =>
                          handleEditItemChange(index, "name", e.target.value)
                        }
                        className="flex-1 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={item.default_quantity}
                        onChange={(e) =>
                          handleEditItemChange(
                            index,
                            "default_quantity",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                          )
                        }
                        className="w-16 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Price ($)"
                        value={item.default_unit_price}
                        onChange={(e) =>
                          handleEditItemChange(
                            index,
                            "default_unit_price",
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                          )
                        }
                        className="w-24 rounded border border-gray-300 p-1.5 text-xs bg-white"
                      />

                      {editItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleEditRemoveItemRow(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Update Canned Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CannedJobsPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}
    >
      <CannedJobsContent />
    </Suspense>
  );
}
