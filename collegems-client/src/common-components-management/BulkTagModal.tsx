import React, { useState } from "react";
import { X } from "lucide-react";
import api from "../api/axios";

interface Student {
  _id?: string;
  name: string;
}

interface BulkTagModalProps {
  students: Student[];
  onClose: () => void;
  onSuccess: () => void;
}

const BulkTagModal: React.FC<BulkTagModalProps> = ({ students, onClose, onSuccess }) => {
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const tags = tagsInput
      .split("\n")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (tags.length === 0) {
      setError("Please enter at least one tag.");
      return;
    }

    const overLimit = tags.find(t => t.length > 50);
    if (overLimit) {
      setError(`Tag "${overLimit.substring(0, 20)}..." exceeds 50 characters.`);
      return;
    }

    const userIds = students.map(s => s._id).filter(Boolean);

    try {
      setIsSubmitting(true);
      await api.put("/users/students/bulk-tags", {
        userIds,
        tags
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign tags.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Tags ({students.length} Selected)
          </h3>
          <button onClick={handleClose} disabled={isSubmitting} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enter one tag per line. Example:
              <br />
              Top Performer
              <br />
              Needs Review
            </p>
            <textarea
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type tags here..."
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Applying..." : "Apply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkTagModal;
