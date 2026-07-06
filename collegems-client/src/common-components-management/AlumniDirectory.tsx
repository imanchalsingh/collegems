import { useState, useEffect } from "react";
import { Search, MapPin, Briefcase, Filter, ChevronDown, UserSquare, Linkedin } from "lucide-react";
import api from "../api/axios";
import { extractArray } from "../utils/apiHelpers";
import AdvancedExportButton from "./AdvancedExportButton";

interface Alumni {
  _id: string;
  name: string;
  email: string;
  batch: string;
  department: string;
  currentCompany: string;
  designation: string;
  linkedInUrl: string;
}

export default function AlumniDirectory() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  useEffect(() => {
    fetchAlumni();
  }, [search, filterBatch, filterDept]);

  const fetchAlumni = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterBatch !== "all") params.append("batch", filterBatch);
      if (filterDept !== "all") params.append("department", filterDept);

      const res = await api.get(`/alumni?${params.toString()}`);
      setAlumni(extractArray(res.data));
    } catch (err) {
      console.error("Failed to fetch alumni", err);
    } finally {
      setLoading(false);
    }
  };

  const batches = ["all", "2019", "2020", "2021", "2022", "2023", "2024"];
  const departments = ["all", "Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alumni Directory</h2>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Connect with our prominent alumni network</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                {batches.map(b => (
                  <option key={b} value={b}>{b === "all" ? "All Batches" : b}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="pl-4 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm appearance-none bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>

            <AdvancedExportButton
              data={alumni}
              filename="Alumni_Directory_Export"
              pdfTitle="Alumni Directory"
              headers={["Name", "Email", "Batch", "Department", "Company", "Designation", "LinkedIn"]}
              dataMapper={(person: Alumni) => [
                person.name,
                person.email,
                person.batch,
                person.department,
                person.currentCompany || "N/A",
                person.designation || "N/A",
                person.linkedInUrl || "N/A"
              ]}
            />
          </div>
        </div>
      </div>

      {/* Alumni Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : alumni.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <UserSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Alumni Found</h3>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alumni.map((person) => (
            <div key={person._id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-lg">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{person.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{person.department} - Batch {person.batch}</p>
                  </div>
                </div>
                {person.linkedInUrl && (
                  <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span>{person.designation || "Not specified"} @ <span className="font-medium text-gray-900 dark:text-white">{person.currentCompany || "N/A"}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span>{person.email}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <a 
                  href={`mailto:${person.email}`}
                  className="w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors block text-center"
                >
                  Connect
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
