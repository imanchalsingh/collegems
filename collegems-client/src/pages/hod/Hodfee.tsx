import { useEffect, useState } from "react";
import api from "../../api/axios";

interface Student {
  _id: string;
  name: string;
}

export default function Hodfee() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [total, setTotal] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchStudents = async () => {
    try {
      const response = await api.get("/users/students");
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Failed to load students data");
    }
  };
  useEffect(() => {
    fetchStudents();
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !total || !dueDate) {
      setMessage("All fields are required");
      return;
    }
    try {
      await api.post("/fee/set", { student: studentId, total, dueDate });
      setMessage("Fee set successfully!");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Error setting fee");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Set Student Fee</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          className="border p-2 w-full rounded"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Total Fee"
          className="border p-2 w-full rounded"
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
        />
        <input
          type="date"
          className="border p-2 w-full rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Set Fee
        </button>
      </form>
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
}
