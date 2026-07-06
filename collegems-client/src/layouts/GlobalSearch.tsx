import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Search, Loader2, User, BookOpen, Bell, FileText } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import api from "../api/axios";

interface SearchResults {
  users: any[];
  courses: any[];
  announcements: any[];
  assignments: any[];
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults(null);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.data.success) {
          setResults(response.data.data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchResults();
    }
  }, [debouncedQuery, isOpen]);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(path);
  };

  const hasResults = results && (
    results.users.length > 0 || 
    results.courses.length > 0 || 
    results.announcements.length > 0 || 
    results.assignments.length > 0
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-64 pl-10 pr-12 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <span className="text-gray-400 text-xs border border-gray-300 dark:border-gray-600 rounded px-1">Ctrl K</span>
        </div>
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="max-h-96 overflow-y-auto p-2">
            
            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            )}

            {!loading && !hasResults && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No results found for "{query}"
              </div>
            )}

            {!loading && results && (
              <>
                {/* Users Section */}
                {results.users.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">People</h3>
                    {results.users.map((u) => (
                      <div 
                        key={u._id} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleNavigation(u.role === 'student' ? `/students/${u._id}` : `/faculty/${u._id}`)}
                      >
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                            {u.matchReason && <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{u.matchReason}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Courses Section */}
                {results.courses.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Courses</h3>
                    {results.courses.map((c) => (
                      <div 
                        key={c._id} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleNavigation('/courses')}
                      >
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-md">
                          <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500">{c.code}</p>
                            {c.matchReason && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{c.matchReason}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Announcements Section */}
                {results.announcements.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Announcements</h3>
                    {results.announcements.map((a) => (
                      <div 
                        key={a._id} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleNavigation('/dashboard')} // Usually displayed on dashboard
                      >
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-md">
                          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate w-56">{a.title}</p>
                          {a.matchReason && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{a.matchReason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assignments Section */}
                {results.assignments.length > 0 && (
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Assignments</h3>
                    {results.assignments.map((a) => (
                      <div 
                        key={a._id} 
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                        onClick={() => handleNavigation('/assignment')}
                      >
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-md">
                          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate w-56">{a.title}</p>
                          {a.matchReason && <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">{a.matchReason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
