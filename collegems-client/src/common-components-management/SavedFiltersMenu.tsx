import React, { useState, useEffect, useRef } from "react";
import { Bookmark, Save, Trash2, ChevronDown, Check } from "lucide-react";
import api from "../api/axios";

interface SavedFilter {
  _id: string;
  name: string;
  filters: any;
}

interface SavedFiltersMenuProps {
  dashboardName: string;
  currentFilters: any;
  onApplyFilter: (filters: any) => void;
}

export function SavedFiltersMenu({ dashboardName, currentFilters, onApplyFilter }: SavedFiltersMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSavedFilters();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSaving(false);
        setFilterName("");
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dashboardName]);

  const fetchSavedFilters = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/saved-filters/${dashboardName}`);
      if (res.data.success) {
        setSavedFilters(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return;
    
    try {
      await api.post("/saved-filters", {
        name: filterName.trim(),
        dashboard: dashboardName,
        filters: currentFilters,
      });
      
      setFilterName("");
      setIsSaving(false);
      fetchSavedFilters();
    } catch (error) {
      console.error("Failed to save filter:", error);
      alert("Failed to save filter. A filter with this name might already exist.");
    }
  };

  const handleDeleteFilter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent dropdown from closing or applying filter
    if (!window.confirm("Are you sure you want to delete this saved filter?")) return;
    
    try {
      await api.delete(`/saved-filters/${id}`);
      fetchSavedFilters();
    } catch (error) {
      console.error("Failed to delete filter:", error);
    }
  };

  const handleApplyFilter = (filterConfig: any) => {
    onApplyFilter(filterConfig);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Saved Filters"
      >
        <Bookmark className="w-4 h-4" />
        <span className="hidden sm:inline">Saved Filters</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          
          {/* Save Current Action */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {!isSaving ? (
              <button 
                onClick={() => setIsSaving(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Current View
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Filter name..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button 
                    onClick={() => { setIsSaving(false); setFilterName(""); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveFilter}
                    disabled={!filterName.trim()}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Filters List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : savedFilters.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No saved filters yet.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {savedFilters.map((sf) => (
                  <li key={sf._id} className="group relative">
                    <button
                      onClick={() => handleApplyFilter(sf.filters)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-between"
                    >
                      <span className="truncate pr-6">{sf.name}</span>
                      <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteFilter(e, sf._id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete saved filter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
