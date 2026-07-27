import React, { useState, useEffect } from "react";
import api from "../api/axios";

// Define the shape of our data
interface Section {
  id: string;
  name: string;
}

export default function BulkRenameSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  // Fetch data as soon as the component loads
  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setError("");
      const response = await api.get("/classes/all"); 
      
      const extractedData = response.data?.data || [];
      
      // Map the database data to our frontend format
      const formattedSections = extractedData.map((cls: any) => ({
        id: cls._id,
        name: cls.name 
      }));

      setSections(formattedSections);
    } catch (err: any) {
      console.error("Failed to fetch sections:", err);
      setError("Failed to load classes from the database.");
    }
  };

  const handleInputChange = (oldName: string, newName: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [oldName]: newName,
    }));
  };

  const getCompiledChanges = () => {
    return Object.entries(pendingChanges)
      .filter(([_, newName]) => newName.trim() !== "")
      .map(([oldName, newName]) => ({
        oldName,
        newName: newName.trim(),
      }));
  };

  const handleApplyChanges = async () => {
    const updates = getCompiledChanges();
    if (updates.length === 0) return;

    setLoading(true);
    try {
      // Sending to the route we created in class.route.js
      await api.put("/classes/bulk-rename", { updates });
      
      alert("Sections renamed successfully!");
      setShowPreview(false);
      setPendingChanges({});
      fetchSections(); // Refresh the table
    } catch (err: any) {
      console.error("Failed to rename sections", err);
      alert(err.response?.data?.message || "Failed to apply changes.");
    }
    setLoading(false);
  };

  const updates = getCompiledChanges();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bulk Rename Sections</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Type new names next to the sections you wish to update.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* The Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">Current Name</th>
              <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white">New Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sections.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  No classes found in the database. Please add a class first!
                </td>
              </tr>
            ) : (
              sections.map((section) => (
                <tr key={section.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {section.name}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full max-w-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder={`Rename ${section.name}...`}
                      value={pendingChanges[section.name] || ""}
                      onChange={(e) => handleInputChange(section.name, e.target.value)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      {!showPreview ? (
        <button
          onClick={() => setShowPreview(true)}
          disabled={updates.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Preview {updates.length} Changes
        </button>
      ) : (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Confirm Changes</h3>
          <ul className="mb-4 space-y-1 text-sm text-blue-800 dark:text-blue-200">
            {updates.map((update) => (
              <li key={update.oldName}>
                <span className="font-medium line-through opacity-70">{update.oldName}</span> 
                {" "}➔{" "} 
                <span className="font-bold">{update.newName}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              onClick={handleApplyChanges}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Applying..." : "Confirm & Apply"}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}