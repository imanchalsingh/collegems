import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ProtectedRoute from "./routes/ProtectedRoute";
import BulkFieldReset from "./hod-components/BulkFieldReset";

import TimeTable from "./user-components/TimeTable";
import StudentDashboard from "./pages/StudentDashboard";
import StudentTransferHistory from "./hod-components/StudentTransferHistory";
//import TimeTable from "./user-components/TimeTable";

//import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import HodDashboard from "./pages/HODDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import MainDashboard from "./pages/MainDashboard";
import ExamSchedule from "./user-components/ExamSchedule";
import Courses from "./user-components/Courses";
import Teachers from "./hod-components/Teachers";
import StudentResults from "./user-components/StudentResults";
import EventsStudent from "./user-components/EventsStudent";
import QuickAccessAll from "./pages/QuickAccessAll";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ReportGenerator from "./pages/ReportGenerator";
import ExaminationFormPage from "./pages/ExaminationFormPage";
import SemesterRegistration from "./user-components/SemesterRegistration";
//import TimeTable from "./user-components/TimeTable";
import DashboardLayout from "./layouts/DashboardLayout";

import LostFoundPortal from "./pages/LostFoundPortal";
import VerifyStudent from "./pages/VerifyStudent";
import RiskDashboard from "./pages/RiskDashboard";

import Library from "./common-components-management/Library";
import ExamHalls from "./hod-components/ExamHalls";
import HallAllocation from "./hod-components/HallAllocation";
import StudentSeatView from "./user-components/StudentSeatView";
import BackToTop from "./components/BackToTop";
import PendingChangesBar from "./components/PendingChangesBar";
import AuditLogs from "./hod-components/AuditLogs";
import ResourceBooking from "./user-components/ResourceBooking";
import BookingManagement from "./hod-components/BookingManagement";
import ResourceManagement from "./hod-components/ResourceManagement";
import AnnouncementForm from "./common-components-management/AnnouncementForm";
import AnnouncementManage from "./common-components-management/AnnouncementManage";

import { PwaManager } from "./components/PwaManager";
import ToastTest from "./pages/ToastTest";

// New Route Guard imports
import withRoleGuard from "./hocs/withRoleGuard";
import { UserRole } from "./constants/role.constants";
import AccessDenied from "./pages/AccessDenied";
import RoleRoute from "./routes/RoleRoute";

// Define Guarded Components
const StudentDashboardGuarded = withRoleGuard(StudentDashboard, { allowedRoles: UserRole.STUDENT });
const ExaminationFormPageGuarded = withRoleGuard(ExaminationFormPage, { allowedRoles: UserRole.STUDENT });
const StudentSeatViewGuarded = withRoleGuard(StudentSeatView, { allowedRoles: UserRole.STUDENT });
const ResourceBookingStudentGuarded = withRoleGuard(ResourceBooking, { allowedRoles: UserRole.STUDENT });

const TeacherDashboardGuarded = withRoleGuard(TeacherDashboard, { allowedRoles: UserRole.TEACHER });
const TeacherAnnouncementsGuarded = withRoleGuard(() => <TeacherDashboard initialTab="announcements" />, { allowedRoles: UserRole.TEACHER });
const ResourceBookingTeacherGuarded = withRoleGuard(ResourceBooking, { allowedRoles: UserRole.TEACHER });

const HodDashboardGuarded = withRoleGuard(HodDashboard, { allowedRoles: UserRole.HOD });
const ReportGeneratorGuarded = withRoleGuard(ReportGenerator, { allowedRoles: UserRole.HOD });
const ExamHallsGuarded = withRoleGuard(ExamHalls, { allowedRoles: UserRole.HOD });
const HallAllocationGuarded = withRoleGuard(HallAllocation, { allowedRoles: UserRole.HOD });
const AuditLogsGuarded = withRoleGuard(AuditLogs, { allowedRoles: UserRole.HOD });
const BookingManagementGuarded = withRoleGuard(BookingManagement, { allowedRoles: UserRole.HOD });
const ResourceManagementGuarded = withRoleGuard(ResourceManagement, { allowedRoles: UserRole.HOD });
const BulkFieldResetGuarded = withRoleGuard(BulkFieldReset, { allowedRoles: UserRole.HOD });

const ParentDashboardGuarded = withRoleGuard(ParentDashboard, { allowedRoles: UserRole.PARENT });

export default function App() {
  return (
    <BrowserRouter>
      <PwaManager />
      <BackToTop />
      <PendingChangesBar onCommit={async (changes) => {
        // Default commit handler, can be customized or context-driven
        console.log("Committing changes:", changes);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }} />
      <Routes>
<Route path="/test-toasts" element={<ToastTest />} />

{/* Public Routes */}
<Route
  path="/"
  element={
    <ProtectedRoute>
      <MainDashboard />
    </ProtectedRoute>
  }
/>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route element={<DashboardLayout />}>
          <Route path="/examschedule" element={<ExamSchedule />} />
          <Route path="/results" element={<StudentResults />} />
          <Route path="/events" element={<EventsStudent />} />
          <Route path="/semester-registration" element={<SemesterRegistration />} />
          <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path="/faculty" element={<Teachers />} />
          <Route path="/quickaccess" element={<QuickAccessAll />} />
          <Route path="/timetable" element={ <TimeTable /> } />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={<StudentDashboardGuarded />}
        />

        <Route
          path="/student/exam-form"
          element={<ExaminationFormPageGuarded />}
        />

        <Route
          path="/student/my-seat"
          element={<StudentSeatViewGuarded />}
        />

        <Route
          path="/student/book-resources"
          element={<ResourceBookingStudentGuarded />}
        />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={<TeacherDashboardGuarded />}
        />

        <Route
          path="/teacher/announcements"
          element={<TeacherAnnouncementsGuarded />}
        />
        <Route
          path="/teacher/book-resources"
          element={<ResourceBookingTeacherGuarded />}
        />

        {/* HOD Routes */}
        <Route
          path="/hod/dashboard"
          element={<HodDashboardGuarded />}
        />

        <Route
          path="/hod/reports"
          element={<ReportGeneratorGuarded />}
        />



        <Route
          path="/hod/exam-halls"
          element={<ExamHallsGuarded />}
        />

        <Route
          path="/hod/hall-allocation"
          element={<HallAllocationGuarded />}
        />

        <Route
          path="/hod/audit-logs"
          element={<AuditLogsGuarded />}
        />

        <Route
          path="/hod/manage-bookings"
          element={<BookingManagementGuarded />}
        />

        <Route
          path="/hod/manage-resources"
          element={<ResourceManagementGuarded />}
        />
        <Route
  path="/hod/student-transfer/:studentId"
  element={
    <RoleRoute role="hod">
      <StudentTransferHistory />
    </RoleRoute>
  }
/>
    
        <Route
          path="/hod/bulk-reset"
          element={<BulkFieldResetGuarded />} 
        />
     

        <Route
          path="/parent/dashboard"
          element={<ParentDashboardGuarded />}
        />
      </Routes>
    </BrowserRouter>
  );
}
