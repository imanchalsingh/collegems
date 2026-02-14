import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RoleRoute from "./components/RoleRoute";
import StudentDashboard from "./pages/students/StudentDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import HodDashboard from "./pages/hod/HODDashboard";
import MainDashboard from "./pages/MainDashboard";
import ExamSchedule from "./pages/students/ExamSchedule";
import Courses from "./pages/students/Courses";
import Teachers from "./components/Teachers";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/examschedule" element={<ExamSchedule />} />
        <Route path="/results" element={<div>Results Page</div>} />
        <Route path="/events" element={<div>Events Page</div>} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/timetable" element={<div>Timetable Page</div>} />
        <Route path="/faculty" element={<Teachers/>} />
        <Route
          path="/student/dashboard"
          element={
            <RoleRoute role="student">
              <StudentDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <RoleRoute role="teacher">
              <TeacherDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/hod/dashboard"
          element={
            <RoleRoute role="hod">
              <HodDashboard />
            </RoleRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
