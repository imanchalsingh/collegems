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
  CheckCircle,
  AlertCircle,
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
  const [showSuccess, setShowSuccess] = useState(false);
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
  // Alternative: Generate text-based PDF without HTML
  const handleDownloadTextPDF = () => {
    try {
      const pdf = new jsPDF();

      // Header
      pdf.setFillColor(10, 41, 94); // #0a295e
      pdf.rect(0, 0, pdf.internal.pageSize.width, 40, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text(subjectTitle || "Subject Title", 105, 25, { align: "center" });

      // Subject Code
      if (subjectCode) {
        pdf.setFontSize(10);
        pdf.text(`Code: ${subjectCode}`, 105, 35, { align: "center" });
      }

      // Course Info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(`Course: ${courseName || "Not specified"}`, 20, 55);
      pdf.text(`Semester: ${semester || "Not specified"}`, 20, 65);
      if (creditHours) {
        pdf.text(`Credit Hours: ${creditHours}`, 20, 75);
      }

      // Units
      let yPos = 95;

      units.forEach((unit, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        // Unit header with accent color
        pdf.setTextColor(189, 35, 35); // #bd2323
        pdf.setFontSize(14);
        pdf.text(
          `Unit ${index + 1}: ${unit.name || `Unit ${index + 1}`}`,
          20,
          yPos,
        );
        yPos += 10;

        // Topics
        if (unit.topics.length > 0) {
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          unit.topics.forEach((topic) => {
            pdf.text(`• ${topic.name}`, 25, yPos);
            yPos += 7;

            // Check page break for topics
            if (yPos > 280) {
              pdf.addPage();
              yPos = 20;
            }
          });
        } else {
          pdf.setTextColor(150, 150, 150);
          pdf.setFont(undefined, "italic");
          pdf.text("No topics added", 25, yPos);
          pdf.setFont(undefined, "normal");
          yPos += 7;
        }

        yPos += 10;
      });

      // Footer
      const footerY = pdf.internal.pageSize.height - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, footerY);

      // Save PDF
      pdf.save(`${subjectTitle || "syllabus"}.pdf`);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Calculate total topics
  const totalTopics = units.reduce((acc, unit) => acc + unit.topics.length, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div
          className="bg-linear-to-r from-[#0a295e] to-[#bd2323] p-8 rounded-2xl mb-8"
          style={{ borderBottom: `4px solid #e6c235` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <BookOpen className="mr-3" size={32} />
                Syllabus Management
              </h1>
              <p className="text-gray-200 mt-2">
                Create and manage course syllabus with unit-wise topics
              </p>
            </div>
            {showSuccess && (
              <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg flex items-center border border-green-500">
                <CheckCircle size={18} className="mr-2" />
                Download started!
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
              activeTab === "create"
                ? "bg-[#bd2323] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Edit3 size={18} className="mr-2" />
            Create Syllabus
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
              activeTab === "preview"
                ? "bg-[#0a295e] text-white shadow-lg"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <FileText size={18} className="mr-2" />
            Preview
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div
            className={`${activeTab === "preview" ? "lg:col-span-1" : "lg:col-span-2"}`}
          >
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <div className="w-2 h-6 bg-[#e6c235] rounded-full mr-3"></div>
                Course Details
              </h2>

              <div className="space-y-4">
                {/* Course Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Course Name *
                    </label>
                    <input
                      placeholder="e.g., Bachelor of Computer Applications"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Course Code
                    </label>
                    <input
                      placeholder="e.g., BCA-101"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Subject Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Subject Title *
                    </label>
                    <input
                      placeholder="e.g., Data Structures"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
                      value={subjectTitle}
                      onChange={(e) => setSubjectTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Subject Code
                    </label>
                    <input
                      placeholder="e.g., DS-201"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Semester and Credits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Semester *
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#bd2323] transition-colors"
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
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Credit Hours
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 4"
                      min="1"
                      max="10"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
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
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Number of Units *
                  </label>
                  <input
                    type="number"
                    placeholder="Enter number of units"
                    min="1"
                    max="20"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323] transition-colors"
                    value={unitCount}
                    onChange={(e) => handleUnitCount(Number(e.target.value))}
                  />
                </div>

                {/* Units */}
                {units.map((unit, index) => (
                  <div
                    key={unit.id}
                    className="border border-gray-700 rounded-lg overflow-hidden bg-gray-750"
                  >
                    {/* Unit Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-700 cursor-pointer"
                      onClick={() => toggleUnitExpansion(unit.id)}
                    >
                      <div className="flex items-center">
                        <Layers size={18} className="mr-3 text-[#e6c235]" />
                        <span className="font-medium">
                          Unit {index + 1}: {unit.name || `Unit ${index + 1}`}
                        </span>
                        <span className="ml-3 text-sm text-gray-400">
                          ({unit.topics.length} topics)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUnit(unit.id);
                          }}
                          className="p-1 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                        {unit.isExpanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </div>

                    {/* Unit Content */}
                    {unit.isExpanded && (
                      <div className="p-4 space-y-4">
                        <input
                          placeholder={`Unit ${index + 1} Name`}
                          className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
                          value={unit.name}
                          onChange={(e) =>
                            updateUnitName(unit.id, e.target.value)
                          }
                        />

                        {/* Topic Input */}
                        <div className="flex space-x-2">
                          <input
                            placeholder="Add a topic and press Enter or click Add"
                            className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#bd2323]"
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
                            className="px-4 py-2 bg-[#bd2323] text-white rounded-lg hover:bg-opacity-80 transition-colors flex items-center"
                          >
                            <Plus size={18} />
                          </button>
                        </div>

                        {/* Topics List */}
                        {unit.topics.length > 0 && (
                          <div className="space-y-2">
                            {unit.topics.map((topic) => (
                              <div
                                key={topic.id}
                                className="flex items-center justify-between p-2 bg-gray-600 rounded-lg group"
                              >
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={topic.completed}
                                    onChange={() =>
                                      toggleTopicStatus(unit.id, topic.id)
                                    }
                                    className="mr-3 rounded border-gray-500 text-[#bd2323] focus:ring-[#bd2323] bg-gray-700"
                                  />
                                  <span
                                    className={
                                      topic.completed
                                        ? "line-through text-gray-400"
                                        : ""
                                    }
                                  >
                                    {topic.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeTopic(unit.id, topic.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} className="text-red-400" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Statistics */}
                {units.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <AlertCircle size={16} className="mr-2 text-[#e6c235]" />
                      Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-[#bd2323]">
                          {units.length}
                        </div>
                        <div className="text-xs text-gray-400">Units</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#0a295e]">
                          {totalTopics}
                        </div>
                        <div className="text-xs text-gray-400">Topics</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#e6c235]">
                          {creditHours || "-"}
                        </div>
                        <div className="text-xs text-gray-400">Credits</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleDownloadTextPDF}
                    disabled={
                      !subjectTitle ||
                      !courseName ||
                      !semester ||
                      units.length === 0
                    }
                    className="flex-1 py-3 px-4 bg-linear-to-r from-[#bd2323] to-[#0a295e] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          {activeTab === "preview" && (
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <div className="w-2 h-6 bg-[#e6c235] rounded-full mr-3"></div>
                  Live Preview
                </h2>

                {/* Preview Content */}
                <div
                  ref={previewRef}
                  id="syllabusPreview"
                  className="bg-gray-900 rounded-lg p-6 border border-gray-700"
                >
                  {/* Header with linear - marked for PDF */}
                  <div
                    data-pdf-header
                    className="bg-linear-to-r from-[#0a295e] to-[#bd2323] -m-6 mb-6 p-6"
                    style={{ borderBottom: `2px solid #e6c235` }}
                  >
                    <h2 className="text-2xl font-bold text-white">
                      {subjectTitle || "Subject Title"}
                    </h2>
                    {subjectCode && (
                      <p className="text-gray-200 text-sm mt-1">
                        Code: {subjectCode}
                      </p>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-700">
                    <div>
                      <p className="text-gray-400 text-sm">Course</p>
                      <p className="font-medium">
                        {courseName || "Not specified"}
                      </p>
                      {courseCode && (
                        <p className="text-xs text-gray-500">{courseCode}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Semester</p>
                      <p className="font-medium">
                        {semester || "Not specified"}
                      </p>
                    </div>
                    {creditHours && (
                      <div>
                        <p className="text-gray-400 text-sm">Credit Hours</p>
                        <p className="font-medium">{creditHours}</p>
                      </div>
                    )}
                  </div>

                  {/* Units */}
                  <div className="space-y-6">
                    {units.length > 0 ? (
                      units.map((unit, index) => (
                        <div
                          key={unit.id}
                          className="border-l-2 pl-4"
                          style={{ borderLeftColor: "#bd2323" }}
                        >
                          <h3
                            className="font-semibold text-lg mb-2"
                            style={{ color: "#e6c235" }}
                          >
                            Unit {index + 1}: {unit.name || `Unit ${index + 1}`}
                          </h3>
                          {unit.topics.length > 0 ? (
                            <ul className="list-disc ml-5 space-y-1 text-gray-300">
                              {unit.topics.map((topic) => (
                                <li
                                  key={topic.id}
                                  className={
                                    topic.completed
                                      ? "line-through text-gray-500"
                                      : ""
                                  }
                                >
                                  {topic.name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm italic">
                              No topics added yet
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Layers size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No units added yet</p>
                        <p className="text-sm">Add units to see preview</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {units.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-500 text-right">
                      Generated on {new Date().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Color Palette Indicator */}
        <div className="mt-8 flex justify-center space-x-2">
          {["#bd2323", "#000000", "#e6c235", "#ffffff", "#0a295e"].map(
            (color) => (
              <div
                key={color}
                className="w-6 h-6 rounded-full border border-gray-700"
                style={{ backgroundColor: color }}
                title={color}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
