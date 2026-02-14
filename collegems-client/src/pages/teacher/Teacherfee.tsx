import { useEffect, useState } from "react";
import api from "../../api/axios";

interface Student {
  _id: string;
  name: string;
}

interface Fee {
  _id: string;
  student: Student;
  total: number;
  paid: number;
  status: string;
}

export default function TeacherFee() {
  const [fees, setFees] = useState<Fee[]>([]);

  const fetchAllFees = async () => {
    try {
      const res = await api.get("/fee/all");
      setFees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllFees();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">All Students Fee</h2>
      <table className="w-full table-auto border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2 py-1">Student</th>
            <th className="border px-2 py-1">Total</th>
            <th className="border px-2 py-1">Paid</th>
            <th className="border px-2 py-1">Remaining</th>
            <th className="border px-2 py-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((f) => (
            <tr key={f._id}>
              <td className="border px-2 py-1">
                {f.student?.name || "Deleted Student"}
              </td>
              <td className="border px-2 py-1">{f.total}</td>
              <td className="border px-2 py-1">{f.paid}</td>
              <td className="border px-2 py-1">{f.total - f.paid}</td>
              <td className="border px-2 py-1">{f.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
