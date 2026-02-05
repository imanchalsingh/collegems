import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get("/dashboard").then(res => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">Student Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        {data.cards.map((c: any, i: number) => (
          <div key={i} className="border p-4">
            <p>{c.title}</p>
            <b>{c.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
