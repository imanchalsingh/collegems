import { useEffect, useState } from "react";
import {
  Bus,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  User,
  Clock,
  MapPin,
  X,
  Check,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";

interface Stop {
  stopName: string;
  arrivalTime: string;
}

interface BusRoute {
  _id: string;
  routeName: string;
  busNumber: string;
  driverName?: string;
  driverPhone?: string;
  stops: Stop[];
  schedule: string[];
  status: "active" | "delayed" | "inactive";
  remarks?: string;
}

export default function BusRoutes() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");

  // Modals / forms state
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
  
  // Form fields
  const [routeName, setRouteName] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [status, setStatus] = useState<"active" | "delayed" | "inactive">("active");
  const [remarks, setRemarks] = useState("");
  const [schedule, setSchedule] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [stops, setStops] = useState<Stop[]>([{ stopName: "", arrivalTime: "" }]);

  useEffect(() => {
    const userRole = localStorage.getItem("role") || "";
    setRole(userRole);
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bus-routes");
      setRoutes(extractArray(res.data));
      setError(null);
    } catch (err: any) {
      console.error("Error fetching bus routes:", err);
      setError("Failed to fetch bus routes. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingRoute(null);
    setRouteName("");
    setBusNumber("");
    setDriverName("");
    setDriverPhone("");
    setStatus("active");
    setRemarks("");
    setSchedule(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    setStops([{ stopName: "", arrivalTime: "" }]);
    setShowModal(true);
  };

  const handleOpenEdit = (route: BusRoute) => {
    setEditingRoute(route);
    setRouteName(route.routeName);
    setBusNumber(route.busNumber);
    setDriverName(route.driverName || "");
    setDriverPhone(route.driverPhone || "");
    setStatus(route.status);
    setRemarks(route.remarks || "");
    setSchedule(route.schedule || []);
    setStops(route.stops?.length ? [...route.stops] : [{ stopName: "", arrivalTime: "" }]);
    setShowModal(true);
  };

  const handleAddStop = () => {
    setStops([...stops, { stopName: "", arrivalTime: "" }]);
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, field: keyof Stop, value: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
  };

  const handleToggleSchedule = (day: string) => {
    if (schedule.includes(day)) {
      setSchedule(schedule.filter((d) => d !== day));
    } else {
      setSchedule([...schedule, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName || !busNumber) return;

    const cleanStops = stops.filter((s) => s.stopName.trim() !== "" && s.arrivalTime.trim() !== "");

    const payload = {
      routeName,
      busNumber,
      driverName,
      driverPhone,
      status,
      remarks,
      schedule,
      stops: cleanStops,
    };

    try {
      if (editingRoute) {
        await api.put(`/bus-routes/${editingRoute._id}`, payload);
      } else {
        await api.post("/bus-routes", payload);
      }
      setShowModal(false);
      fetchRoutes();
    } catch (err: any) {
      console.error("Error saving bus route:", err);
      alert(err.response?.data?.message || "Failed to save route. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bus route?")) return;
    try {
      await api.delete(`/bus-routes/${id}`);
      fetchRoutes();
    } catch (err: any) {
      console.error("Error deleting bus route:", err);
      alert("Failed to delete route.");
    }
  };

  const getStatusBadge = (routeStatus: string) => {
    switch (routeStatus) {
      case "active":
        return "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-800/30";
      case "delayed":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30";
      case "inactive":
        return "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-800/30";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const filteredRoutes = routes.filter(
    (route) =>
      route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.stops?.some((stop) => stop.stopName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isEditable = role === "hod" || role === "admin";

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search routes or stops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm rounded-lg text-gray-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Bus Route
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading schedules...</p>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center text-gray-500 dark:text-gray-400">
          <Bus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Bus Routes Found</h3>
          <p className="text-sm mt-1">Try refining your search or add a new route.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRoutes.map((route) => (
            <div
              key={route._id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              {/* Card top */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 dark:text-white flex items-center gap-2">
                      <Bus className="w-5 h-5 text-purple-600" />
                      {route.routeName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Bus: <span className="font-semibold">{route.busNumber}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(route.status)}`}>
                      {route.status}
                    </span>
                    {isEditable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(route)}
                          className="p-1 text-gray-500 hover:text-purple-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit Route"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(route._id)}
                          className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Delete Route"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver details */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg text-sm mb-6 border border-gray-100 dark:border-gray-850/50">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{route.driverName || "Driver N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{route.driverPhone || "Phone N/A"}</span>
                  </div>
                </div>

                {/* Stops Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Stops & Schedule</h4>
                  <div className="relative pl-6 border-l border-gray-200 dark:border-gray-850 ml-3 space-y-4">
                    {route.stops && route.stops.length > 0 ? (
                      route.stops.map((stop, sIdx) => (
                        <div key={sIdx} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-white dark:bg-gray-900 border-2 border-purple-600 rounded-full" />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{stop.stopName}</span>
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {stop.arrivalTime}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic pl-1">No stops configured for this route.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Schedule and Remarks */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                {route.schedule && route.schedule.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1 shrink-0" />
                    {route.schedule.map((day, dIdx) => (
                      <span key={dIdx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-850 rounded">
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                )}
                {route.remarks && (
                  <p className="text-xs text-gray-500 italic mt-1 leading-relaxed">
                    * {route.remarks}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] flex flex-col transition-all">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bus className="w-5 h-5 text-purple-600" />
                {editingRoute ? "Edit Bus Route" : "Add Bus Route"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Route Name *</label>
                  <input
                    type="text"
                    required
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g. Metro Line A"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bus Number *</label>
                  <input
                    type="text"
                    required
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    placeholder="e.g. DL-1P-1234"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="delayed">Delayed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Stops on main roads only"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
              </div>

              {/* Schedule Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule (Active Days)</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isChecked = schedule.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleSchedule(day)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          isChecked
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stops Fields */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Stops & ETAs *
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stop
                  </button>
                </div>

                <div className="space-y-3">
                  {stops.map((stop, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        required
                        value={stop.stopName}
                        onChange={(e) => handleStopChange(index, "stopName", e.target.value)}
                        placeholder="Stop name (e.g. City Center)"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      <input
                        type="text"
                        required
                        value={stop.arrivalTime}
                        onChange={(e) => handleStopChange(index, "arrivalTime", e.target.value)}
                        placeholder="ETA (e.g. 08:30 AM)"
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-950 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(index)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-850/40 p-4 -mx-6 -mb-6 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingRoute ? "Save Changes" : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
