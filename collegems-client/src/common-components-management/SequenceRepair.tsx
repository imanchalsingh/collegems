import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wrench, Search, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import api from "../api/axios";

interface RepairPreview {
  recordId: string;
  oldValue: string;
  newValue: string;
}

interface AnalysisResult {
  totalRecords: number;
  gaps: string[];
  duplicates: string[];
  preview: RepairPreview[];
  message: string;
}

export const SequenceRepair: React.FC = () => {
  const [model, setModel] = useState("User");
  const [field, setField] = useState("studentId");
  const [prefix, setPrefix] = useState("STU");
  const [padding, setPadding] = useState(3);

  const {
    data: analysis,
    isLoading: isAnalyzing,
    error: analyzeError,
    refetch: analyzeSequence,
  } = useQuery<AnalysisResult>({
    queryKey: ["sequenceAnalysis", model, field, prefix, padding],
    queryFn: async () => {
      const res = await api.get(
        `/api/sequences/analyze?model=${model}&field=${field}&prefix=${prefix}&padding=${padding}`
      );
      return res.data.data;
    },
    enabled: false, // Only fetch on button click
  });

  const repairMutation = useMutation({
    mutationFn: async (previewData: RepairPreview[]) => {
      const res = await api.post("/api/sequences/repair", {
        model,
        field,
        prefix,
        padding,
        previewData,
      });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message);
      analyzeSequence(); // Re-analyze to confirm success
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Repair failed");
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeSequence();
  };

  const handleRepair = () => {
    if (!analysis?.preview || analysis.preview.length === 0) return;
    if (window.confirm(`Are you sure you want to repair ${analysis.preview.length} record(s)? This will shift sequence numbers down to fill gaps.`)) {
      repairMutation.mutate(analysis.preview);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Automatic Sequence Repair</h2>
            <p className="text-sm text-slate-500">
              Detect and repair broken sequence numbering (e.g., STU001, STU002, STU004).
            </p>
          </div>
        </div>

        <form onSubmit={handleScan} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="User">User</option>
              <option value="Results">Results</option>
              <option value="Attendance">Attendance</option>
              <option value="Course">Course</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Field Name</label>
            <input
              type="text"
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g. studentId"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g. STU"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Padding Length</label>
            <input
              type="number"
              min="1"
              max="10"
              value={padding}
              onChange={(e) => setPadding(parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing || repairMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan Sequence
          </button>
        </form>
      </div>

      <div className="p-6">
        {analyzeError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Analysis Failed</h4>
              <p className="text-sm opacity-90">{(analyzeError as any)?.response?.data?.message || analyzeError.message}</p>
            </div>
          </div>
        )}

        {analysis && !analyzeError && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <div className="text-2xl font-bold text-slate-800">{analysis.totalRecords}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total Records Checked</div>
              </div>
              <div className={`p-4 border rounded-xl text-center ${analysis.gaps.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className={`text-2xl font-bold ${analysis.gaps.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{analysis.gaps.length}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Gaps Detected</div>
              </div>
              <div className={`p-4 border rounded-xl text-center ${analysis.duplicates.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`text-2xl font-bold ${analysis.duplicates.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>{analysis.duplicates.length}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Duplicates Detected</div>
              </div>
            </div>

            {analysis.gaps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Missing Values:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.gaps.slice(0, 20).map(gap => (
                    <span key={gap} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                      {gap}
                    </span>
                  ))}
                  {analysis.gaps.length > 20 && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                      +{analysis.gaps.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {analysis.preview.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-medium text-slate-800">Repair Preview</h3>
                  <button
                    onClick={handleRepair}
                    disabled={repairMutation.isPending}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {repairMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Execute Repair
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white sticky top-0 z-10 text-slate-500 text-xs uppercase shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium">Record ID</th>
                        <th className="px-4 py-3 font-medium">Current Value</th>
                        <th className="px-4 py-3 font-medium text-center">Action</th>
                        <th className="px-4 py-3 font-medium">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.preview.map((change) => (
                        <tr key={change.recordId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-mono text-xs text-slate-500">{change.recordId}</td>
                          <td className="px-4 py-2 font-medium text-red-600">{change.oldValue}</td>
                          <td className="px-4 py-2 flex justify-center text-slate-400">
                            <ArrowRight className="w-4 h-4" />
                          </td>
                          <td className="px-4 py-2 font-medium text-emerald-600">{change.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">Sequence is Healthy</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {analysis.message}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
