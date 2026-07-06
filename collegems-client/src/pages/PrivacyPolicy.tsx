import { NavLink, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  School,
  Shield,
  Eye,
  Database,
  Lock,
  Globe,
  Cookie,
  UserCheck,
  Mail,
} from "lucide-react";

const sections = [
  {
    id: "introduction",
    icon: Shield,
    color: "blue",
    title: "Introduction",
    content: `Welcome to the College Management System ("CMS", "we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.

Please read this policy carefully. If you disagree with its terms, please discontinue use of the platform.`,
  },
  {
    id: "information-collection",
    icon: Database,
    color: "amber",
    title: "Information We Collect",
    content: `We collect information you provide directly when you register or use the platform:

• Identity Information — full name, student/teacher/employee ID, role
• Contact Information — email address
• Academic Information — course enrollment, semester, department, grades, attendance records
• Usage Data — login timestamps, feature interactions, session duration
• Technical Data — IP address, browser type, device identifiers, and operating system

We do not collect payment card numbers or sensitive financial data through this platform.`,
  },
  {
    id: "data-usage",
    icon: Eye,
    color: "emerald",
    title: "How We Use Your Data",
    content: `We use the information we collect to:

• Provide and operate the platform, including dashboards, grade tracking, and attendance management
• Authenticate your identity and enforce role-based access controls
• Send transactional notifications (e.g., exam schedules, fee reminders)
• Improve platform features and user experience through aggregated analytics
• Comply with legal obligations and institutional policies
• Respond to support requests and administrative communications

We do not sell your personal data to third parties.`,
  },
  {
    id: "data-security",
    icon: Lock,
    color: "purple",
    title: "Data Security",
    content: `We implement appropriate technical and organisational security measures to protect your information against unauthorised access, alteration, disclosure, or destruction. These include:

• Encrypted data transmission via HTTPS/TLS
• Hashed password storage (no plaintext passwords are stored)
• Role-based access controls limiting data access to authorised users
• Session token expiration and secure storage practices

While we strive to use commercially acceptable means to protect your data, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.`,
  },
  {
    id: "third-party",
    icon: Globe,
    color: "rose",
    title: "Third-Party Services",
    content: `The platform may integrate with third-party services to enhance functionality. These may include:

• Cloud hosting and infrastructure providers
• Email delivery services for notifications
• Analytics services (using anonymised or aggregated data only)

These third parties have their own privacy policies and we encourage you to review them. We do not share personally identifiable information with third parties for their marketing purposes.`,
  },
  {
    id: "cookies",
    icon: Cookie,
    color: "cyan",
    title: "Cookies & Local Storage",
    content: `We use browser localStorage and session mechanisms to:

• Maintain your authenticated session (auth token)
• Remember your role and preferences across page reloads
• Store non-sensitive UI state (e.g., "remember me" email)

We do not use third-party advertising cookies. You can clear your browser storage at any time through your browser settings, though this will sign you out of the platform.`,
  },
  {
    id: "user-rights",
    icon: UserCheck,
    color: "emerald",
    title: "Your Rights",
    content: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

• Access — request a copy of the data we hold about you
• Correction — request correction of inaccurate or incomplete data
• Deletion — request deletion of your account and associated data
• Portability — request your data in a structured, machine-readable format
• Objection — object to certain types of data processing

To exercise any of these rights, please contact your institution administrator or reach us using the contact information below. We will respond within 30 days.`,
  },
  {
    id: "contact",
    icon: Mail,
    color: "blue",
    title: "Contact Information",
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

College Management System — Privacy Team
Email: privacy@collegems.edu
Address: College Management System, Administrative Office

For urgent security disclosures, please email with the subject line "SECURITY DISCLOSURE" so we can prioritise your message.`,
  },
];

const colorClasses: Record<
  string,
  { bg: string; text: string; border: string; icon: string; light: string }
> = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "text-blue-600",
    light: "bg-blue-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "text-amber-600",
    light: "bg-amber-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    light: "bg-emerald-100",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: "text-purple-600",
    light: "bg-purple-100",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: "text-rose-600",
    light: "bg-rose-100",
  },
  cyan: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    icon: "text-cyan-600",
    light: "bg-cyan-100",
  },
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <School className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">
                  College<span className="text-blue-600">Portal</span>
                </span>
              </div>
            </div>

            {/* Back to Home */}
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            We take your privacy seriously. This policy explains what data we
            collect, why we collect it, and how we protect it.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
            <span>Last updated: June 2, 2026</span>
          </div>
        </div>
      </div>

      {/* Table of Contents — desktop only */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                On this page
              </h2>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const colors = colorClasses[section.color];
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 hover:${colors.bg} hover:${colors.text} transition-colors`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.light} border ${colors.border}`} />
                      {section.title}
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {sections.map((section) => {
              const Icon = section.icon;
              const colors = colorClasses[section.color];

              return (
                <div
                  key={section.id}
                  id={section.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 scroll-mt-24"
                >
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`p-3 rounded-lg ${colors.light} flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.icon}`} />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mt-1">
                      {section.title}
                    </h2>
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              );
            })}

            {/* Back to top / navigation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">
                  Have more questions about your privacy?
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Contact our team at privacy@collegems.edu
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  Back to top
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                  <School className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">
                  CollegePortal
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                © {new Date().getFullYear()} College Management System. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <span className="text-sm text-blue-600 font-medium">
                Privacy
              </span>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contact
              </a>
              <a
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
