import { useEffect, useState } from "react";
import api from "../api/axios";

const digestOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function TeacherSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    teacherId: "",
  });
  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "UTC",
    digestFrequency: "weekly",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    inApp: true,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [profileRes, settingsRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/users/me/preferences"),
        ]);

        const user = profileRes.data;
        setProfile({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          department: user.department || "",
          teacherId: user.teacherId || "",
        });

        const settings = settingsRes.data || {};
        setPreferences({
          language: settings.preferences?.language || "en",
          timezone: settings.preferences?.timezone || "UTC",
          digestFrequency: settings.preferences?.digestFrequency || "weekly",
        });
        setNotifications({
          email: settings.notifications?.email ?? true,
          sms: settings.notifications?.sms ?? false,
          inApp: settings.notifications?.inApp ?? true,
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
        setMessage({ type: "error", text: "Unable to load settings." });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleProfileChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationToggle = (field: string) => {
    setNotifications((prev) => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await api.put("/users/me", profile);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await api.put("/users/me/preferences", { preferences, notifications });
      setMessage({ type: "success", text: "Preferences updated successfully." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to update preferences.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage({ type: "error", text: "Enter current and new passwords." });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await api.put("/users/me/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to update password.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">Update your personal information.</p>
          </div>
          <button
            onClick={handleProfileSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            disabled={saving}
          >
            Save
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm text-gray-600">
            Full name
            <input
              type="text"
              value={profile.name}
              onChange={(event) => handleProfileChange("name", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Email
            <input
              type="email"
              value={profile.email}
              onChange={(event) => handleProfileChange("email", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Phone
            <input
              type="tel"
              value={profile.phone}
              onChange={(event) => handleProfileChange("phone", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Department
            <input
              type="text"
              value={profile.department}
              onChange={(event) => handleProfileChange("department", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Teacher ID
            <input
              type="text"
              value={profile.teacherId}
              onChange={(event) => handleProfileChange("teacherId", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
            <p className="text-sm text-gray-500">Control how your portal behaves.</p>
          </div>
          <button
            onClick={handlePreferencesSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            disabled={saving}
          >
            Save
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm text-gray-600">
            Language
            <input
              type="text"
              value={preferences.language}
              onChange={(event) => handlePreferenceChange("language", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Timezone
            <input
              type="text"
              value={preferences.timezone}
              onChange={(event) => handlePreferenceChange("timezone", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Digest frequency
            <select
              value={preferences.digestFrequency}
              onChange={(event) => handlePreferenceChange("digestFrequency", event.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {digestOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-700">Email notifications</span>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={() => handleNotificationToggle("email")}
              className="h-4 w-4 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-700">SMS notifications</span>
            <input
              type="checkbox"
              checked={notifications.sms}
              onChange={() => handleNotificationToggle("sms")}
              className="h-4 w-4 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-700">In-app notifications</span>
            <input
              type="checkbox"
              checked={notifications.inApp}
              onChange={() => handleNotificationToggle("inApp")}
              className="h-4 w-4 text-blue-600"
            />
          </label>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Password</h2>
            <p className="text-sm text-gray-500">Change your account password.</p>
          </div>
          <button
            onClick={handlePasswordSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            disabled={saving}
          >
            Update
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1 text-sm text-gray-600">
            Current password
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(event) =>
                setPasswordData((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            New password
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(event) =>
                setPasswordData((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-600">
            Confirm password
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(event) =>
                setPasswordData((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
