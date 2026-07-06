import { useState } from "react";
import axios from "axios";

const ALLOWED_FIELDS = [
  { value: "phone", label: "Phone Number" },
  { value: "department", label: "Department" },
  { value: "tags", label: "Tags" },
  { value: "teacherId", label: "Teacher ID" },
];

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: string;
}

interface PreviewUser {
  _id: string;
  name: string;
  email: string;
  [key: string]: string;
}

const BulkFieldReset = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [field, setField] = useState("");
  const [preview, setPreview] = useState<PreviewUser[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch all users
  const fetchUsers = async () => {
  try {
    const { data } = await axios.get("/api/users");
    // Handle different response shapes
    const userList = Array.isArray(data) ? data : data.users || data.data || [];
    setUsers(userList);
  } catch {
    setMessage("Failed to fetch users");
  }
};

  // Toggle user selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all users
  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u._id));
    }
  };

  // Preview before reset
  const handlePreview = async () => {
    if (!selectedIds.length || !field) {
      setMessage("Please select users and a field");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(
        "/api/users/bulk-reset?preview=true",
        { userIds: selectedIds, field }
      );
      setPreview(data.affectedUsers);
      setShowPreview(true);
      setMessage("");
    } catch {
      setMessage("Preview failed");
    } finally {
      setLoading(false);
    }
  };

  // Confirm and reset
  const handleReset = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post("/api/users/bulk-reset", {
        userIds: selectedIds,
        field,
      });
      setMessage(data.message);
      setShowPreview(false);
      setSelectedIds([]);
      fetchUsers();
    } catch {
      setMessage("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Load users on mount
  useState(() => {
    fetchUsers();
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Bulk Field Reset
      </h2>

      {/* Field Selector */}
      <div className="mb-4 flex gap-4 items-center">
        <select
          className="border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={field}
          onChange={(e) => setField(e.target.value)}
        >
          <option value="">-- Select Field to Reset --</option>
          {ALLOWED_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <button
          onClick={handlePreview}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Preview Reset"}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg">
          {message}
        </div>
      )}

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user._id)}
                    onChange={() => toggleSelect(user._id)}
                  />
                </td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3 capitalize">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              Preview: Resetting "{field}" for {preview.length} users
            </h3>
            <ul className="mb-4 max-h-60 overflow-y-auto">
              {preview.map((u) => (
                <li key={u._id} className="py-2 border-b text-sm">
                  <span className="font-medium">{u.name}</span> —{" "}
                  <span className="text-gray-500">{u.email}</span>
                  <br />
                  <span className="text-red-500">
                    Current {field}: {u[field] || "empty"}
                  </span>{" "}
                  → <span className="text-green-600">null</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkFieldReset;