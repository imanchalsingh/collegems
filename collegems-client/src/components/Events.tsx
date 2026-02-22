import { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Users,
  Search,
  CalendarDays,
  Moon,
  Loader2,
} from "lucide-react";
import api from "../api/axios";

interface Event {
  _id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  attendees: string[];
  createdAt: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAttendees, setShowAttendees] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/events");
      setEvents(res.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique months from events
  const months = [
    ...new Set(
      events.map((event) => {
        const date = new Date(event.date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }),
    ),
  ].sort();

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMonth =
      selectedMonth === "all" ||
      new Date(event.date).toISOString().slice(0, 7) === selectedMonth;

    return matchesSearch && matchesMonth;
  });

  // Sort events by date (upcoming first)
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const upcomingEvents = sortedEvents.filter(
    (event) => new Date(event.date) >= new Date(),
  );
  const pastEvents = sortedEvents.filter(
    (event) => new Date(event.date) < new Date(),
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Past";
    return `${diffDays} days left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Campus Events
              </h1>
              <p className="text-gray-500 mt-1">
                Discover and join upcoming events
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Months</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {new Date(month + "-01").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upcoming Events */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Events
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({upcomingEvents.length} events)
            </span>
          </h2>

          {upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span
                          className={`
                          inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                          ${getDaysUntil(event.date) === "Today" ? "bg-green-100 text-green-700" : ""}
                          ${getDaysUntil(event.date) === "Tomorrow" ? "bg-blue-100 text-blue-700" : ""}
                          ${getDaysUntil(event.date).includes("days") ? "bg-amber-100 text-amber-700" : ""}
                        `}
                        >
                          {getDaysUntil(event.date)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(event.date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {event.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-2" />
                        Organized by {event.organizer}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowAttendees(true);
                      }}
                      className="w-full mt-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Users className="w-4 h-4" />
                      View Attendees ({event.attendees?.length || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-gray-400" />
              Past Events
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({pastEvents.length} events)
              </span>
            </h2>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                      Event
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                      Organizer
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase">
                      Attendees
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pastEvents.map((event) => (
                    <tr
                      key={event._id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-6">
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        {formatDate(event.date)}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        {event.location}
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600">
                        {event.organizer}
                      </td>
                      <td className="py-3 px-6">
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowAttendees(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          {event.attendees?.length || 0}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Attendees Modal */}
      {showAttendees && selectedEvent && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Attendees
                </h3>
                <button
                  onClick={() => setShowAttendees(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedEvent.name}</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedEvent.attendees?.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No attendees yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvent.attendees?.map((attendee, index) => (
                    <div
                      key={index}
                      className="flex items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-700">
                          {attendee.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{attendee}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAttendees(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
