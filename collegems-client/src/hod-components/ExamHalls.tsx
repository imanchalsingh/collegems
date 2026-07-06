import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ToggleLeft,
  ToggleRight,
  MapPin,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface ExamHall {
  _id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  rows: number;
  columns: number;
  facilities: string[];
  isActive: boolean;
  createdAt: string;
}

interface HallFormData {
  name: string;
  building: string;
  floor: number;
  rows: number;
  columns: number;
  facilities: string[];
}

const FACILITY_OPTIONS = [
  { value: "projector", label: "Projector" },
  { value: "ac", label: "AC" },
  { value: "wheelchair-accessible", label: "Wheelchair Accessible" },
  { value: "whiteboard", label: "Whiteboard" },
  { value: "power-outlets", label: "Power Outlets" },
];

const defaultFormData: HallFormData = {
  name: "",
  building: "",
  floor: 0,
  rows: 0,
  columns: 0,
  facilities: [],
};

const ExamHalls: React.FC = () => {
  const [halls, setHalls] = useState<ExamHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingHall, setEditingHall] = useState<ExamHall | null>(null);
  const [formData, setFormData] = useState<HallFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHalls();
  }, []);

  const fetchHalls = async () => {
    try {
      setLoading(true);
      const res = await api.get("/exam-halls");
      setHalls(extractArray(res.data));
    } catch (err) {
      console.error("Error fetching exam halls:", err);
      setErrorMsg("Failed to load examination halls. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingHall(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (hall: ExamHall) => {
    setEditingHall(hall);
    setFormData({
      name: hall.name,
      building: hall.building,
      floor: hall.floor,
      rows: hall.rows,
      columns: hall.columns,
      facilities: hall.facilities,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHall(null);
    setFormData(defaultFormData);
  };

  const handleFacilityToggle = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.building.trim()) {
      setErrorMsg("Hall name and building are required.");
      return;
    }
    if (formData.rows <= 0 || formData.columns <= 0) {
      setErrorMsg("Rows and columns must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setSuccessMsg("");
      setErrorMsg("");

      const payload = {
        ...formData,
        capacity: formData.rows * formData.columns,
      };

      if (editingHall) {
        const res = await api.put(`/exam-halls/${editingHall._id}`, payload);
        const updatedHall = res.data.hall || res.data;
        setHalls(halls.map((h) => (h._id === editingHall._id ? updatedHall : h)));
        setSuccessMsg("Examination hall updated successfully!");
      } else {
        const res = await api.post("/exam-halls", payload);
        const newHall = res.data.hall || res.data;
        setHalls([...halls, newHall]);
        setSuccessMsg("Examination hall created successfully!");
      }

      closeModal();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error saving exam hall:", err);
      setErrorMsg(err.response?.data?.message || "Failed to save examination hall.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this examination hall?")) return;

    try {
      setActioningId(id);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await api.delete(`/exam-halls/${id}`);
      setHalls(halls.filter((h) => h._id !== id));
      setSuccessMsg(res.data.message || "Examination hall deleted successfully.");

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error deleting exam hall:", err);
      setErrorMsg(err.response?.data?.message || "Failed to delete examination hall.");
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleActive = async (hall: ExamHall) => {
    try {
      setActioningId(hall._id);
      setSuccessMsg("");
      setErrorMsg("");

      const res = await api.put(`/exam-halls/${hall._id}`, {
        isActive: !hall.isActive,
      });

      const updatedHall = res.data.hall || res.data;
      setHalls(halls.map((h) => (h._id === hall._id ? updatedHall : h)));
      setSuccessMsg(`Hall ${!hall.isActive ? "activated" : "deactivated"} successfully.`);

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error toggling hall status:", err);
      setErrorMsg(err.response?.data?.message || "Failed to update hall status.");
    } finally {
      setActioningId(null);
    }
  };

  // Filter and Search logic
  const filteredHalls = halls.filter((hall) => {
    const matchesSearch =
      hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hall.building.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && hall.isActive) ||
      (statusFilter === "Inactive" && !hall.isActive);

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: halls.length,
    active: halls.filter((h) => h.isActive).length,
    inactive: halls.filter((h) => !h.isActive).length,
    totalCapacity: halls.filter((h) => h.isActive).reduce((sum, h) => sum + h.capacity, 0),
  };

  const getFacilityBadge = (facility: string) => {
    const labels: Record<string, string> = {
      projector: "Projector",
      ac: "AC",
      "wheelchair-accessible": "♿ Accessible",
      whiteboard: "Whiteboard",
      "power-outlets": "Power Outlets",
    };
    return labels[facility] || facility;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Halls",
            value: stats.total,
            icon: Building2,
            bg: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
          },
          {
            label: "Active Halls",
            value: stats.active,
            icon: CheckCircle2,
            bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          },
          {
            label: "Inactive Halls",
            value: stats.inactive,
            icon: AlertCircle,
            bg: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
          },
          {
            label: "Total Capacity",
            value: stats.totalCapacity,
            icon: MapPin,
            bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by hall name, building..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchHalls}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Add Hall */}
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Hall
          </button>
        </div>
      </div>

      {/* Main Halls Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-sm text-gray-500 mt-3">Loading examination halls...</p>
          </div>
        ) : filteredHalls.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No halls found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              No examination halls match your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Hall Name</th>
                  <th className="px-6 py-4">Building</th>
                  <th className="px-6 py-4">Floor</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Facilities</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {filteredHalls.map((hall) => (
                  <tr
                    key={hall._id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Hall Name */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{hall.name}</p>
                    </td>

                    {/* Building */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-800 dark:text-gray-300">{hall.building}</span>
                      </div>
                    </td>

                    {/* Floor */}
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{hall.floor}</td>

                    {/* Capacity */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {hall.capacity}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {hall.rows} × {hall.columns}
                        </p>
                      </div>
                    </td>

                    {/* Facilities */}
                    <td className="px-6 py-4">
                      <div className="max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {hall.facilities.length > 0 ? (
                            hall.facilities.map((f, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-400 font-medium"
                              >
                                {getFacilityBadge(f)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          hall.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"
                        }`}
                      >
                        {hall.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggleActive(hall)}
                          disabled={actioningId === hall._id}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 rounded-lg transition-colors"
                          title={hall.isActive ? "Deactivate" : "Activate"}
                        >
                          {hall.isActive ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(hall)}
                          disabled={actioningId === hall._id}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit Hall"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(hall._id)}
                          disabled={actioningId === hall._id}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Hall"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                {editingHall ? "Edit Examination Hall" : "Add Examination Hall"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hall Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Hall A-101"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Building */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Building <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="e.g. Main Block"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Floor
                </label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Rows & Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Rows <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.rows}
                    onChange={(e) =>
                      setFormData({ ...formData, rows: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Columns <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.columns}
                    onChange={(e) =>
                      setFormData({ ...formData, columns: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Calculated Capacity */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Calculated Capacity
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {formData.rows * formData.columns}
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                  {formData.rows} rows × {formData.columns} columns
                </p>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Facilities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FACILITY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        formData.facilities.includes(opt.value)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-600"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.facilities.includes(opt.value)}
                        onChange={() => handleFacilityToggle(opt.value)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {editingHall ? "Update Hall" : "Create Hall"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamHalls;
