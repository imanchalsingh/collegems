import { useState, useEffect } from "react";
import { Lock, Plus, Calendar, Trash2, ShieldAlert } from "lucide-react";
import api from "../api/axios";

interface DataLock {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  affectedModules: string[];
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
  };
}

export default function DataLocks() {
  const [locks, setLocks] = useState<DataLock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [affectedModules, setAffectedModules] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const moduleOptions = ["results", "attendance", "assignments", "courses", "all"];

  useEffect(() => {
    fetchLocks();
  }, []);

  const fetchLocks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/data-locks");
      setLocks(res.data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load data locks.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/data-locks", {
        name,
        startTime,
        endTime,
        affectedModules,
      });
      setShowModal(false);
      setName("");
      setStartTime("");
      setEndTime("");
      setAffectedModules([]);
      fetchLocks();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create data lock.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lock window?")) return;
    try {
      await api.delete(`/data-locks/${id}`);
      fetchLocks();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete lock.");
    }
  };

  const handleModuleToggle = (mod: string) => {
    if (affectedModules.includes(mod)) {
      setAffectedModules(affectedModules.filter(m => m !== mod));
    } else {
      setAffectedModules([...affectedModules, mod]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            Academic Data Locks
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure periods where academic data edits are temporarily disabled.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Lock
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locks.map(lock => (
            <div key={lock._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm flex flex-col relative">
              <div className="absolute top-4 right-4">
                <button onClick={() => handleDelete(lock._id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${lock.isActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{lock.name}</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${lock.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {lock.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {new Date(lock.startTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>End: {new Date(lock.endTime).toLocaleString()}</span>
                </div>
                
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2 mt-4">Modules Locked</span>
                  <div className="flex flex-wrap gap-2">
                    {lock.affectedModules.map(mod => (
                      <span key={mod} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium capitalize">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {locks.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Lock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No data locks configured yet.</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 relative">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Data Lock</h3>
            <form onSubmit={handleCreateLock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lock Name (e.g. Result Week)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Enter a descriptive name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Affected Modules</label>
                <div className="grid grid-cols-2 gap-2">
                  {moduleOptions.map(mod => (
                    <label key={mod} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={affectedModules.includes(mod)}
                        onChange={() => handleModuleToggle(mod)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={affectedModules.length === 0}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
