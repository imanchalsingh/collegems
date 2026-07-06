import { useEffect, useState } from "react";
import api from "../api/axios";
import { UserCircle, Shuffle, ShieldCheck } from "lucide-react";
import { extractArray } from "../utils/apiHelpers";

interface Owner {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  profilePicture?: string;
}

interface TransferHistory {
  _id: string;
  previousOwnerId: Owner | null;
  newOwnerId: Owner;
  transferredBy: Owner;
  transferredAt: string;
  reason: string;
}

interface RecordOwnershipProps {
  modelName: string;
  recordId: string;
  onTransferSuccess?: () => void;
}

export function RecordOwnership({ modelName, recordId, onTransferSuccess }: RecordOwnershipProps) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [history, setHistory] = useState<TransferHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [staffList, setStaffList] = useState<Owner[]>([]);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [reason, setReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  const fetchOwnershipData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/ownership/info/${modelName}/${recordId}`);
      if (response.data.success) {
        setOwner(response.data.data.owner);
        setHistory(response.data.data.history || []);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setOwner(null); // No owner assigned yet
      } else {
        setError(err.response?.data?.message || "Failed to load ownership information");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Assuming a generic route exists to get staff. In this app, /users/teachers or similar is often used.
      // Since staff can be hod, teacher, admin, we can fetch users and filter, or use an existing endpoint.
      // For this implementation, we will fetch teachers as they are the primary owners in the system.
      const response = await api.get("/users/teachers");
      setStaffList(extractArray(response.data));
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  useEffect(() => {
    fetchOwnershipData();
  }, [modelName, recordId]);

  const handleTransfer = async () => {
    if (!newOwnerId) {
      alert("Please select a new owner.");
      return;
    }
    
    try {
      setTransferring(true);
      await api.post("/ownership/transfer", {
        modelName,
        recordId,
        newOwnerId,
        reason,
      });
      alert("Ownership transferred successfully!");
      setModalOpen(false);
      setReason("");
      setNewOwnerId("");
      fetchOwnershipData();
      if (onTransferSuccess) onTransferSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to transfer ownership.");
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = () => {
    fetchStaff();
    setModalOpen(true);
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4"><div className="h-4 bg-gray-200 rounded w-3/4"></div></div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Record Ownership
        </h3>
        <button
          onClick={openTransferModal}
          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
        >
          <Shuffle className="w-3 h-3" />
          Transfer
        </button>
      </div>

      {owner ? (
        <div className="flex items-center gap-3 mb-4">
          {owner.profilePicture ? (
            <img src={owner.profilePicture} alt={owner.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{owner.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{owner.role} {owner.department ? `• ${owner.department}` : ""}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4">No owner currently assigned.</p>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Transfer History</p>
          <div className="space-y-3">
            {history.slice(-3).reverse().map((h) => (
              <div key={h._id} className="text-xs flex flex-col gap-0.5">
                <span className="text-gray-900 dark:text-gray-300">
                  Transferred to <span className="font-medium text-blue-600">{h.newOwnerId?.name}</span>
                </span>
                <span className="text-gray-500">
                  By {h.transferredBy?.name} on {new Date(h.transferredAt).toLocaleDateString()}
                </span>
                {h.reason && <span className="text-gray-400 italic">"{h.reason}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Transfer Ownership</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select a new staff member to take ownership of this record.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Owner *</label>
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a staff member</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={staff._id} disabled={owner?._id === staff._id}>
                      {staff.name} ({staff.department}) {owner?._id === staff._id ? "(Current Owner)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (Optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Current owner is on leave..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[80px]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring || !newOwnerId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-blue-400"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
