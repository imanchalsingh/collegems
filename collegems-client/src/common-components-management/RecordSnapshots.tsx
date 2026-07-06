import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw, User as UserIcon, Calendar, Loader2 } from "lucide-react";
import api from "../api/axios";

interface Snapshot {
  _id: string;
  operation: "update" | "delete" | "replace";
  createdAt: string;
  editor?: {
    name: string;
    email: string;
    role: string;
  };
  data: any;
}

interface RecordSnapshotsProps {
  modelName: string;
  recordId: string;
  className?: string;
}

export const RecordSnapshots: React.FC<RecordSnapshotsProps> = ({ modelName, recordId, className = "" }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const { data: snapshots = [], isLoading, error } = useQuery<Snapshot[]>({
    queryKey: ["snapshots", modelName, recordId],
    queryFn: async () => {
      const res = await api.get(`/api/snapshots/${modelName}/${recordId}`);
      return res.data.data;
    },
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (snapshotId: string) => {
      const res = await api.post(`/api/snapshots/${snapshotId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      alert("Record restored successfully");
      setIsOpen(false);
      // Invalidate relevant queries based on the model
      queryClient.invalidateQueries({ queryKey: [modelName.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["snapshots", modelName, recordId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to restore record");
    },
  });

  const handleRestore = () => {
    if (!selectedSnapshot) return;
    if (window.confirm("Are you sure you want to restore this version? This will overwrite the current record.")) {
      restoreMutation.mutate(selectedSnapshot._id);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
      >
        <History className="w-4 h-4" />
        Version History
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4" />
              Revision History
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              &times;
            </button>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
                Failed to load history. Ensure you have admin privileges.
              </div>
            )}

            {!isLoading && snapshots.length === 0 && (
              <div className="text-center text-slate-500 py-6 text-sm">
                No previous versions found for this record.
              </div>
            )}

            {!isLoading && snapshots.length > 0 && (
              <div className="space-y-4">
                {snapshots.map((snapshot, index) => (
                  <div
                    key={snapshot._id}
                    className={`p-3 rounded-md border text-sm transition-colors cursor-pointer ${
                      selectedSnapshot?._id === snapshot._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-800">
                        Version {snapshots.length - index}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {snapshot.operation}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </div>
                      {snapshot.editor && (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5" />
                          {snapshot.editor.name} ({snapshot.editor.role})
                        </div>
                      )}
                    </div>

                    {selectedSnapshot?._id === snapshot._id && (
                      <div className="mt-3 pt-3 border-t border-blue-200/50">
                        <pre className="text-[10px] p-2 bg-white rounded border overflow-x-auto max-h-32">
                          {JSON.stringify(snapshot.data, null, 2)}
                        </pre>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore();
                          }}
                          disabled={restoreMutation.isPending}
                          className="mt-3 w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md transition-colors disabled:opacity-50"
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                          Restore this version
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
