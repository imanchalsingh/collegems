// FILE: collegems-client/src/teacher-components/AnnouncementForm.tsx
import { useState, useRef, useEffect } from "react";
import {
  Bell, Send, Tag, Calendar, Users, AlertCircle,
  CheckCircle, Loader2, FileText, Megaphone, BellOff,
} from "lucide-react";
import api from "../api/axios";
import { scrollToFirstError } from "../utils/formHelpers";

//  Constants 

const COURSES = ["BCA", "MCA", "BBA", "MBA"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

const ROLES = [
  { value: "all", label: "Everyone" },
  { value: "student", label: "Students only" },
  { value: "teacher", label: "Teachers only" },
  { value: "hod", label: "HOD only" },
  { value: "parent", label: "Parents only" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

//  Types 

interface FormData {
  title: string;
  message: string;
  targetRole: string;
  targetCourse: string;
  targetSemester: string;
  expiresAt: string;
  priority: string;
  isSilent: boolean;
}

interface FormErrors {
  title?: string;
  message?: string;
  targetRole?: string;
}

const EMPTY_FORM: FormData = {
  title: "",
  message: "",
  targetRole: "all",
  targetCourse: "",
  targetSemester: "",
  expiresAt: "",
  priority: "medium",
  isSilent: false,
};

//  Validation ─

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.title.trim()) {
    errors.title = "Title is required.";
  } else if (data.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  if (!data.message.trim()) {
    errors.message = "Message is required.";
  } else if (data.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }
  return errors;
}

//  Reusable sub-components (same pattern as AchievementSubmissionForm) 

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

function FieldWrapper({
  label,
  icon: Icon,
  required,
  children,
  error,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

//  Main Component ─

export interface AnnouncementData {
  _id: string;
  title: string;
  message: string;
  targetRole: string;
  targetCourse: string | null;
  targetSemester: string | null;
  expiresAt: string | null;
  priority: string;
  isSilent?: boolean;
  status?: "draft" | "published";
}

interface Props {
  mode?: "create" | "edit";
  initialAnnouncement?: AnnouncementData;
  onSuccess?: () => void;
}

export default function AnnouncementForm({ mode = "create", initialAnnouncement, onSuccess }: Props) {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  useEffect(() => {
    if (initialAnnouncement) {
      setFormData({
        title: initialAnnouncement.title || "",
        message: initialAnnouncement.message || "",
        targetRole: initialAnnouncement.targetRole || "all",
        targetCourse: initialAnnouncement.targetCourse || "",
        targetSemester: initialAnnouncement.targetSemester || "",
        expiresAt: initialAnnouncement.expiresAt ? new Date(initialAnnouncement.expiresAt).toISOString().slice(0, 16) : "",
        priority: initialAnnouncement.priority || "medium",
        isSilent: initialAnnouncement.isSilent || false,
      });
      if (initialAnnouncement.status) {
         submitActionRef.current = initialAnnouncement.status;
      }
    } else {
      setFormData(EMPTY_FORM);
      submitActionRef.current = "published";
    }
  }, [initialAnnouncement]);
  const [submitStatus, setSubmitStatus] = useState<"draft" | "published">("published");
  const submitActionRef = useRef<"draft" | "published">("published");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const inputBase =
    "w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
  const inputNormal = `${inputBase} border-gray-300`;
  const inputErr = `${inputBase} border-red-400 bg-red-50`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setApiError("");
  };

  const handlePriority = (value: string) =>
    setFormData((prev) => ({ ...prev, priority: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      scrollToFirstError(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        targetCourse: formData.targetCourse || null,
        targetSemester: formData.targetSemester || null,
        expiresAt: formData.expiresAt || null,
        status: submitActionRef.current,
      };

      if (mode === "edit" && initialAnnouncement?._id) {
        await api.put(`/announcements/${initialAnnouncement._id}`, payload);
      } else {
        await api.post("/announcements", payload);
      }
      setIsSuccess(true);
      setFormData(EMPTY_FORM);
      setErrors({});
      
      // Reset action back to default "Publish" mode for the next interaction
      submitActionRef.current = "published";
      setSubmitStatus("published");
      
      setTimeout(() => setIsSuccess(false), 4000);
      onSuccess?.();
    } catch (err: any) {
      setApiError(err?.response?.data?.message || "Failed to post announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setApiError("");
    setIsSuccess(false);
    submitActionRef.current = "published";
    setSubmitStatus("published");
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/*  Header card (same structure as AchievementSubmissionForm)  */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Megaphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Announcement
              </h1>
              <p className="text-gray-500 mt-0.5">
                Send a targeted notice to specific groups
              </p>
            </div>
          </div>
        </div>

        {/*  Success banner  */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                {mode === "edit" 
                  ? "Announcement updated successfully." 
                  : (submitActionRef.current === "draft" 
                      ? "Draft saved successfully." 
                      : "Announcement published successfully.")}
              </p>
            </div>
            <button
              onClick={() => setIsSuccess(false)}
              className="text-green-600 hover:text-green-800 transition-colors p-1"
            >
              ×
            </button>
          </div>
        )}

        {/*  API error banner  */}
        {apiError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/*  Form card  */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Row 1: Title */}
            <FieldWrapper label="Title" icon={Bell} required error={errors.title}>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Library closed on Friday"
                className={errors.title ? inputErr : inputNormal}
              />
            </FieldWrapper>

            {/* Row 2: Message */}
            <FieldWrapper label="Message" icon={FileText} required error={errors.message}>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                placeholder="Write the full announcement here..."
                className={`${errors.message ? inputErr : inputNormal} resize-none`}
              />
            </FieldWrapper>

            {/* Row 3: Priority (radio buttons — same style as Rank in AchievementForm) */}
            <FieldWrapper label="Priority" icon={Tag}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRIORITIES.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${formData.priority === p.value
                        ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                        : "border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50"
                      }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={formData.priority === p.value}
                      onChange={() => handlePriority(p.value)}
                      className="sr-only"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </FieldWrapper>

            {/* Divider + section label (same as "Student Information" section) */}
            <div className="pt-2 border-t border-gray-100">
              <div className="space-y-4">
                {/* Target Role */}
                <FieldWrapper label="Role" icon={Users} error={errors.targetRole}>
                  <select
                    name="targetRole"
                    value={formData.targetRole}
                    onChange={handleChange}
                    className={inputNormal}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>

                {/* Course + Semester*/}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldWrapper label="Course" icon={Tag}>
                    <select
                      name="targetCourse"
                      value={formData.targetCourse}
                      onChange={handleChange}
                      className={inputNormal}
                    >
                      <option value="">All Courses</option>
                      {COURSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper label="Semester" icon={Calendar}>
                    <select
                      name="targetSemester"
                      value={formData.targetSemester}
                      onChange={handleChange}
                      className={inputNormal}
                    >
                      <option value="">All Semesters</option>
                      {SEMESTERS.map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </FieldWrapper>
                </div>

                {/* Expiry */}
                <FieldWrapper label="Expires On (optional)" icon={Calendar}>
                  <input
                    type="datetime-local"
                    name="expiresAt"
                    value={formData.expiresAt}
                    onChange={handleChange}
                    className={inputNormal}
                  />
                </FieldWrapper>
              </div>
            </div>

            {/* Audience preview badges */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                {ROLES.find((r) => r.value === formData.targetRole)?.label}
              </span>
              {formData.targetCourse && (
                <span className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                  {formData.targetCourse}
                </span>
              )}
              {formData.targetSemester && (
                <span className="px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
                  Sem {formData.targetSemester}
                </span>
              )}
            </div>

            {/* Silent Publish */}
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isSilent"
                  checked={formData.isSilent}
                  onChange={(e) => setFormData(prev => ({ ...prev, isSilent: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <BellOff className="w-4 h-4 text-gray-500" />
                  Silent Publish
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-1">
                (Publish without sending push notifications or alerts)
              </p>
            </div>

            {/* Submit row*/}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                onClick={() => {
                  submitActionRef.current = "draft";
                  setSubmitStatus("draft");
                }}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && submitStatus === "draft" ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="submit"
                onClick={() => {
                  submitActionRef.current = "published";
                  setSubmitStatus("published");
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && submitStatus === "published" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
