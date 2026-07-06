import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { format } from "date-fns";
import { X, Save, Clock, RotateCcw } from "lucide-react";
import { useToast } from "../../hooks/useToast";

interface Version {
  _id: string;
  versionName: string;
  savedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Props {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export default function VersionHistorySidebar({ groupId, isOpen, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionName, setVersionName] = useState("");
  const { toast } = useToast();

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/study-groups/${groupId}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, groupId]);

  const handleSaveVersion = async () => {
    try {
      setSaving(true);
      await axios.post(`/study-groups/${groupId}/versions`, {
        versionName: versionName || undefined,
      });
      toast.success("Version saved successfully");
      setVersionName("");
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save version");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!window.confirm("Are you sure you want to restore this version? Current unsaved edits will be lost.")) {
      return;
    }
    
    try {
      await axios.post(`/study-groups/${groupId}/versions/${versionId}/restore`);
      toast.success("Version restored successfully. Please wait while the document reloads.");
      onRestore(); 
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore version");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white h-full flex flex-col shadow-lg transition-all absolute right-0 top-0 z-10">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Version History
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Version name (optional)"
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Version"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-sm text-gray-500">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="text-center text-sm text-gray-500">No versions saved yet.</div>
        ) : (
          <div className="space-y-4">
            {versions.map((v) => (
              <div key={v._id} className="border border-gray-200 rounded p-3 bg-gray-50 hover:bg-white transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 text-sm truncate pr-2">{v.versionName}</h4>
                  <button
                    onClick={() => handleRestore(v._id)}
                    className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Restore this version"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  By {v.savedBy?.name || "Unknown User"}
                </div>
                <div className="text-xs text-gray-400">
                  {format(new Date(v.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
