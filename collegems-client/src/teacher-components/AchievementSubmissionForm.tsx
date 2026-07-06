import { useState } from "react";
import {Trophy, Tag, Calendar, FileText, CheckCircle, Loader2, AlertCircle, X,} from "lucide-react";
import axios from "axios";
import { scrollToFirstError } from "../utils/formHelpers";

//  Types 

interface FormData {
  title: string;
  description: string;
  achievementDate: string;
  category: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  achievementDate?: string;
  category?: string;
  api?: string;
}

interface UploadedFile {
  file: File;
  preview: string;
}

//  Constants 

const CATEGORIES = [
  { value: "award", label: "Award" },
  { value: "hackathon", label: "Hackathon Winner" },
  { value: "publication", label: "Publication" },
  { value: "conference", label: "Conference Speaker" },
  { value: "competition", label: "Competition Winner" },
  { value: "certification", label: "Certification" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  achievementDate: "",
  category: "",
};

//  Validation 

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.title.trim()) {
    errors.title = "Achievement title is required.";
  } else if (data.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }

  if (!data.category) {
    errors.category = "Please select a category.";
  }

  if (!data.achievementDate) {
    errors.achievementDate = "Achievement date is required.";
  }

  if (!data.description.trim()) {
    errors.description = "Description is required.";
  } else if (data.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters.";
  } else if (data.description.trim().length > 1000) {
    errors.description = "Description must be under 1000 characters.";
  }

  return errors;
}

//  Field Error Message 

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

//  Form Field Wrapper 

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

//  Main Component 

export default function AchievementSubmissionForm() {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const inputBase =
    "w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
  const inputNormal = `${inputBase} border-gray-300`;
  const inputError = `${inputBase} border-red-400 bg-red-50`;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          api: `File "${file.name}" is too large. Max size is 10MB.`,
        }));
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        newFiles.push({
          file,
          preview: event.target?.result as string,
        });
        if (newFiles.length === Object.keys(files).length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      scrollToFirstError(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const token = localStorage.getItem("token");
      const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        achievementDate: formData.achievementDate,
        category: formData.category,
      };

      const response = await axios.post(
        `${backendURL}/achievements/submit`,
        submitData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setIsSubmitting(false);
      setIsSuccess(true);
      setSuccessMessage(
        "Achievement submitted successfully! Your achievement is awaiting admin approval."
      );
      setFormData(EMPTY_FORM);
      setUploadedFiles([]);
      setErrors({});

      // Auto-hide success message after 4 seconds
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (error: any) {
      setIsSubmitting(false);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit achievement. Please try again.";
      setErrors((prev) => ({
        ...prev,
        api: errorMessage,
      }));
      console.error("Achievement submission error:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Submit Your Achievement
              </h1>
              <p className="text-gray-500 mt-0.5">
                Share your professional accomplishments and awards
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {isSuccess && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errors.api && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">
                {errors.api}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Row 1: Title + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldWrapper
                label="Achievement Title"
                icon={Trophy}
                required
                error={errors.title}
              >
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Best Research Paper Award"
                  className={errors.title ? inputError : inputNormal}
                />
              </FieldWrapper>

              <FieldWrapper
                label="Category"
                icon={Tag}
                required
                error={errors.category}
              >
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={errors.category ? inputError : inputNormal}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
            </div>

            {/* Row 2: Date */}
            <FieldWrapper
              label="Achievement Date"
              icon={Calendar}
              required
              error={errors.achievementDate}
            >
              <input
                type="date"
                name="achievementDate"
                value={formData.achievementDate}
                onChange={handleChange}
                className={errors.achievementDate ? inputError : inputNormal}
              />
            </FieldWrapper>

            {/* Row 3: Description */}
            <FieldWrapper
              label="Description"
              icon={FileText}
              required
              error={errors.description}
            >
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your achievement in detail (min 10 chars, max 1000 chars)"
                rows={4}
                maxLength={1000}
                className={`${errors.description ? inputError : inputNormal} resize-none`}
              />
              <p className="mt-1 text-xs text-gray-400 text-right">
                {formData.description.length} / 1000
              </p>
            </FieldWrapper>

            {/* File Upload Section */}
            <div className="border-t border-gray-100 pt-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                📎 Proof Documents (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="sr-only"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, or images (max 10MB each)
                  </p>
                </label>
              </div>

              {/* Uploaded Files Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="text-sm text-gray-700">
                        {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setFormData(EMPTY_FORM);
                  setUploadedFiles([]);
                  setErrors({});
                  setIsSuccess(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    Submit Achievement
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
