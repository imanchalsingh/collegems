import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

interface TransferEntry {
  _id: string;
  field: string;
  previousValue: string;
  newValue: string;
  changedAt: string;
  changedBy: { name: string; role: string };
}

interface Student {
  name: string;
  email: string;
}

const FIELD_LABELS: Record<string, string> = {
  branch: "Branch",
  section: "Section",
  semester: "Semester",
  course: "Course",
};

const StudentTransferHistory = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [history, setHistory] = useState<TransferEntry[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    branch: "",
    section: "",
    semester: "",
    course: "",
  });
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchHistory = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    const { data } = await axios.get(
      `http://localhost:5000/api/transfer/students/${studentId}/transfer-history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setStudent(data.student);
    setHistory(data.history || []);
  } catch {
    setError("Failed to load transfer history");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchHistory();
  }, [studentId]);

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setSuccessMsg("");
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v !== "")
      );
      const token = localStorage.getItem("token") || "";
      await axios.put(
        `http://localhost:5000/api/transfer/students/${studentId}/transfer`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg("Transfer updated successfully!");
      setForm({ branch: "", section: "", semester: "", course: "" });
      fetchHistory();
    } catch {
      setError("Failed to update transfer");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        Student Transfer History
      </h2>
      {student && (
        <p className="text-gray-500 mb-6">
          {student.name} — {student.email}
        </p>
      )}

      {/* Update Form */}
      <div className="bg-blue-50 rounded-xl p-4 mb-8 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-3">Update Transfer</h3>
        <div className="grid grid-cols-2 gap-3">
          {["branch", "section", "semester", "course"].map((field) => (
            <div key={field}>
              <label className="text-sm text-gray-600 capitalize">{field}</label>
              <input
                className="w-full border rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder={`New ${field}`}
                value={form[field as keyof typeof form]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {updating ? "Updating..." : "Update Transfer"}
        </button>
        {successMsg && (
          <p className="mt-2 text-green-600 text-sm">{successMsg}</p>
        )}
      </div>

      {/* Timeline */}
      <h3 className="font-semibold text-gray-700 mb-4">Transfer Timeline</h3>
      {history.length === 0 ? (
        <p className="text-gray-400">No transfer history found.</p>
      ) : (
        <div className="relative border-l-2 border-blue-200 pl-6 space-y-6">
          {history.map((entry) => (
            <div key={entry._id} className="relative">
              <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">
                    {FIELD_LABELS[entry.field] || entry.field} Changed
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.changedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 items-center text-sm">
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded">
                    {entry.previousValue}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded">
                    {entry.newValue}
                  </span>
                </div>
                {entry.changedBy && (
                  <p className="text-xs text-gray-400 mt-2">
                    By: {entry.changedBy.name} ({entry.changedBy.role})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTransferHistory;