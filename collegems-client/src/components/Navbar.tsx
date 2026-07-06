import { NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          <NavLink
            to="/"
            className="text-xl font-bold text-blue-600"
          >
            SCMS
          </NavLink>

          <div className="flex gap-2">
            <NavLink to="/" className={linkClass}>
              Home
            </NavLink>

            <NavLink to="/courses" className={linkClass}>
              Courses
            </NavLink>

            <NavLink to="/events" className={linkClass}>
              Events
            </NavLink>

            <NavLink to="/library" className={linkClass}>
              Library
            </NavLink>

            <NavLink to="/calendar" className={linkClass}>
              Calendar
            </NavLink>

            <NavLink to="/timetable" className={linkClass}>
              Timetable
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}