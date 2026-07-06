import { useEffect, useState } from "react";

type EventItem = {
  title: string;
  date: string;
  type?: string;
};

export default function AcademicCalendar() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/academic-calendar", {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      console.log("CALENDAR API:", data);

      // ✅ FIX: हमेशा array बनाओ
      const eventsArray = Array.isArray(data)
        ? data
        : data.events || [];

      setEvents(eventsArray);
    } catch (err) {
      console.log("Error:", err);
      setEvents([]); // safety
    }
  };

  fetchEvents();
}, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>📅 Academic Calendar</h1>

      <div style={{ marginTop: "20px" }}>
        {Array.isArray(events) &&
          events.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "10px",
                border: "1px solid gray",
                marginBottom: "10px",
              }}
            >
              <h3>{e.title}</h3>
              <p>{e.date}</p>
            </div>
          ))}
      </div>
    </div>
  );
}