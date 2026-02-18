import { useState, useRef } from "react";
import jsPDF from "jspdf";
import {
  BookOpen,
  Download,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Grid,
  List,
  Eye,
  X,
} from "lucide-react";

// TypeScript interfaces
interface Topic {
  id: string;
  name: string;
  completed?: boolean;
}

interface Unit {
  id: string;
  name: string;
  topics: Topic[];
  topicInput: string;
  isExpanded: boolean;
}

export default function Syllabus() {
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [semester, setSemester] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [creditHours, setCreditHours] = useState<number | "">("");
  const [unitCount, setUnitCount] = useState<number | "">("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "preview">("create");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const previewRef = useRef<HTMLDivElement>(null);

  // Handle unit count change
  const handleUnitCount = (value: number) => {
    setUnitCount(value);
    const newUnits: Unit[] = Array.from({ length: value }, (_, index) => ({
      id: `unit-${Date.now()}-${index}`,
      name: "",
      topics: [],
      topicInput: "",
      isExpanded: true,
    }));
    setUnits(newUnits);
  };

  // Add topic to a unit
  const addTopic = (unitId: string) => {
    const unitIndex = units.findIndex((u) => u.id === unitId);
    if (unitIndex === -1) return;

    const topicText = units[unitIndex].topicInput.trim();
    if (!topicText) return;

    const updated = [...units];
    const newTopic: Topic = {
      id: `topic-${Date.now()}-${Math.random()}`,
      name: topicText,
      completed: false,
    };

    updated[unitIndex].topics.push(newTopic);
    updated[unitIndex].topicInput = "";
    setUnits(updated);
  };

  // Remove topic from unit
  const removeTopic = (unitId: string, topicId: string) => {
    setUnits((prev) =>
      prev.map((unit) => {
        if (unit.id === unitId) {
          return {
            ...unit,
            topics: unit.topics.filter((t) => t.id !== topicId),
          };
        }
        return unit;
      }),
    );
  };

  // Toggle topic completion status
  const toggleTopicStatus = (unitId: string, topicId: string) => {
    setUnits((prev) =>
      prev.map((unit) => {
        if (unit.id === unitId) {
          return {
            ...unit,
            topics: unit.topics.map((topic) =>
              topic.id === topicId
                ? { ...topic, completed: !topic.completed }
                : topic,
            ),
          };
        }
        return unit;
      }),
    );
  };

  // Toggle unit expansion
  const toggleUnitExpansion = (unitId: string) => {
    setUnits((prev) =>
      prev.map((unit) =>
        unit.id === unitId ? { ...unit, isExpanded: !unit.isExpanded } : unit,
      ),
    );
  };

  // Update unit name
  const updateUnitName = (unitId: string, name: string) => {
    setUnits((prev) =>
      prev.map((unit) => (unit.id === unitId ? { ...unit, name } : unit)),
    );
  };

  // Remove unit
  const removeUnit = (unitId: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    setUnitCount((prev) => (typeof prev === "number" ? prev - 1 : prev));
  };

  // Generate PDF
  const handleDownloadTextPDF = () => {
    try {
      const pdf = new jsPDF();

      // Header
      pdf.setFillColor(37, 99, 235); // Blue-600
      pdf.rect(0, 0, pdf.internal.pageSize.width, 45, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text(subjectTitle || "Subject Title", 105, 25, { align: "center" });

      if (subjectCode) {
        pdf.setFontSize(11);
        pdf.text(`Code: ${subjectCode}`, 105, 35, { align: "center" });
      }

      // Course Info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      let yPos = 60;

      pdf.setFont("bold");
      pdf.text("Course Information", 20, yPos);
      pdf.setFont("normal");
      yPos += 10;

      pdf.text(`Course: ${courseName || "Not specified"}`, 25, yPos);
      yPos += 7;
      pdf.text(`Semester: ${semester || "Not specified"}`, 25, yPos);
      yPos += 7;
      if (creditHours) {
        pdf.text(`Credit Hours: ${creditHours}`, 25, yPos);
        yPos += 10;
      } else {
        yPos += 10;
      }

      // Units
      units.forEach((unit, index) => {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        // Unit header
        pdf.setTextColor(37, 99, 235); // Blue-600
        pdf.setFontSize(14);
        pdf.setFont("bold");
        pdf.text(
          `Unit ${index + 1}: ${unit.name || `Unit ${index + 1}`}`,
          20,
          yPos,
        );
        yPos += 8;

        // Topics
        pdf.setFont("normal");
        pdf.setTextColor(75, 85, 99); // Gray-600
        pdf.setFontSize(11);

        if (unit.topics.length > 0) {
          unit.topics.forEach((topic) => {
            pdf.text(`• ${topic.name}`, 25, yPos);
            yPos += 6;

            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
          });
        } else {
          pdf.setFont("italic");
          pdf.text("No topics added", 25, yPos);
          pdf.setFont("normal");
          yPos += 6;
        }

        yPos += 8;
      });

      // Footer
      const footerY = pdf.internal.pageSize.height - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175); // Gray-400
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, footerY);
      pdf.text(`Syllabus v1.0`, 180, footerY, { align: "right" });

      pdf.save(`${subjectTitle || "syllabus"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Calculate total topics
  const totalTopics = units.reduce((acc, unit) => acc + unit.topics.length, 0);

  // Check if form is valid for download
  const isDownloadValid =
    subjectTitle && courseName && semester && units.length > 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Units</p>
              <p className="text-xl font-bold text-gray-900">{units.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Topics</p>
              <p className="text-xl font-bold text-gray-900">{totalTopics}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Grid className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Credits</p>
              <p className="text-xl font-bold text-gray-900">
                {creditHours || "-"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion</p>
              <p className="text-xl font-bold text-gray-900">
                {units.length > 0
                  ? Math.round((totalTopics / (units.length * 5)) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "create"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Edit3 size={16} />
          Create Syllabus
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === "preview"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Eye size={16} />
          Preview
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div
          className={
            activeTab === "preview" ? "lg:col-span-1" : "lg:col-span-2"
          }
        >
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Course Details
                </h2>
                {units.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setViewMode(viewMode === "list" ? "grid" : "list")
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {viewMode === "list" ? (
                        <Grid className="w-4 h-4 text-gray-600" />
                      ) : (
                        <List className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Course Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    placeholder="e.g., Bachelor of Computer Applications"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Code
                  </label>
                  <input
                    placeholder="e.g., BCA-101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Subject Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Title <span className="text-blue-600">*</span>
                  </label>
                  <input
                    placeholder="e.g., Data Structures"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={subjectTitle}
                    onChange={(e) => setSubjectTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    placeholder="e.g., DS-201"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Semester and Credits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester <span className="text-blue-600">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={`Semester ${num}`}>
                        Semester {num}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={creditHours}
                    onChange={(e) =>
                      setCreditHours(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                  />
                </div>
              </div>

              {/* Number of Units */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Units <span className="text-blue-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter number of units"
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={unitCount}
                  onChange={(e) => handleUnitCount(Number(e.target.value))}
                />
              </div>

              {/* Units */}
              {units.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="font-medium text-gray-900">Units & Topics</h3>

                  {units.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
                    >
                      {/* Unit Header */}
                      <div
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleUnitExpansion(unit.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Layers size={18} className="text-blue-600" />
                          <span className="font-medium text-gray-900">
                            Unit {index + 1}: {unit.name || `Unit ${index + 1}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({unit.topics.length} topics)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeUnit(unit.id);
                            }}
                            className="p-1 hover:bg-white rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                          {unit.isExpanded ? (
                            <ChevronUp size={18} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-500" />
                          )}
                        </div>
                      </div>

                      {/* Unit Content */}
                      {unit.isExpanded && (
                        <div className="p-4 space-y-4">
                          <input
                            placeholder={`Unit ${index + 1} Name`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={unit.name}
                            onChange={(e) =>
                              updateUnitName(unit.id, e.target.value)
                            }
                          />

                          {/* Topic Input */}
                          <div className="flex gap-2">
                            <input
                              placeholder="Add a topic and press Enter or click Add"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={unit.topicInput}
                              onChange={(e) => {
                                const updated = [...units];
                                updated[index].topicInput = e.target.value;
                                setUnits(updated);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTopic(unit.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => addTopic(unit.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Plus size={16} />
                              Add
                            </button>
                          </div>

                          {/* Topics List */}
                          {unit.topics.length > 0 && (
                            <div className="space-y-2">
                              {unit.topics.map((topic) => (
                                <div
                                  key={topic.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={topic.completed}
                                      onChange={() =>
                                        toggleTopicStatus(unit.id, topic.id)
                                      }
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span
                                      className={`text-gray-900 ${
                                        topic.completed
                                          ? "line-through text-gray-400"
                                          : ""
                                      }`}
                                    >
                                      {topic.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      removeTopic(unit.id, topic.id)
                                    }
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={14} className="text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleDownloadTextPDF}
                  disabled={!isDownloadValid}
                  className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>

              {/* Form Validation Message */}
              {!isDownloadValid && units.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                  <AlertCircle
                    size={16}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-amber-800">
                    Please fill in all required fields (*) to download the PDF.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        {activeTab === "preview" && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Live Preview
                </h2>
              </div>

              {/* Preview Content */}
              <div ref={previewRef} className="p-6 bg-gray-50">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="bg-blue-600 p-6">
                    <h2 className="text-xl font-bold text-white">
                      {subjectTitle || "Subject Title"}
                    </h2>
                    {subjectCode && (
                      <p className="text-blue-100 text-sm mt-1">
                        Code: {subjectCode}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Course Info */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Course</p>
                        <p className="text-sm font-medium text-gray-900">
                          {courseName || "Not specified"}
                        </p>
                        {courseCode && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {courseCode}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Semester</p>
                        <p className="text-sm font-medium text-gray-900">
                          {semester || "Not specified"}
                        </p>
                      </div>
                      {creditHours && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Credit Hours
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {creditHours}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Units */}
                    <div className="space-y-4">
                      {units.length > 0 ? (
                        units.map((unit, index) => (
                          <div
                            key={unit.id}
                            className="border-l-2 border-blue-600 pl-4"
                          >
                            <h3 className="font-semibold text-gray-900 mb-2">
                              Unit {index + 1}:{" "}
                              {unit.name || `Unit ${index + 1}`}
                            </h3>
                            {unit.topics.length > 0 ? (
                              <ul className="space-y-1">
                                {unit.topics.map((topic) => (
                                  <li
                                    key={topic.id}
                                    className="text-sm text-gray-600 flex items-start gap-2"
                                  >
                                    <span className="text-blue-600 mt-1">
                                      •
                                    </span>
                                    <span
                                      className={
                                        topic.completed
                                          ? "line-through text-gray-400"
                                          : ""
                                      }
                                    >
                                      {topic.name}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                No topics added yet
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No units added yet</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Add units to see preview
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {units.length > 0 && (
                      <div className="pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                        <span>
                          Generated on {new Date().toLocaleDateString()}
                        </span>
                        <span>Syllabus v1.0</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
