import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { getTimetableEntries, getTimetableStatus, getTimetableSuggestions, updateTimetableEntry } from "../../api/timetable";

export const TimetableGrid = () => {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const statusRes = await getTimetableStatus(id!);
      if (statusRes.success) setStatus(statusRes.data);

      const entriesRes = await getTimetableEntries(id!);
      if (entriesRes.success) setEntries(entriesRes.data);

      if (statusRes.success && statusRes.data) {
        const suggRes = await getTimetableSuggestions({
          department: statusRes.data.department,
          semester: statusRes.data.semester,
          timetableId: id!
        });
        if (suggRes.success) setSuggestions(suggRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: any) => {
    if (!selectedEntry) return;
    setUpdating(true);
    try {
      const res = await updateTimetableEntry(selectedEntry._id, {
        room: suggestion.room._id,
        faculty: suggestion.faculty._id,
        course: suggestion.course._id,
        timeSlot: selectedEntry.timeSlot._id // Keep original timeslot
      });
      if (res.success) {
        alert("Entry updated successfully!");
        setSelectedEntry(null);
        fetchData(); // Refresh grid
      } else {
        alert(res.message || "Failed to update entry");
      }
    } catch (err: any) {
      alert(err.message || "Conflict or error occurred");
    } finally {
      setUpdating(false);
    }
  };

// Replaced in first chunk

  if (loading) return <div className="p-6">Loading timetable...</div>;
  if (!status) return <div className="p-6">Timetable not found.</div>;

  // Group entries by day, then by timeSlot
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  // Get unique timeslots from entries
  const timeSlots = Array.from(new Set(entries.map(e => `${e.timeSlot.startTime}-${e.timeSlot.endTime}`))).sort();

  const getEntry = (day: string, slot: string) => {
    return entries.filter(e => 
      e.timeSlot.dayOfWeek === day && 
      `${e.timeSlot.startTime}-${e.timeSlot.endTime}` === slot
    );
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-auto">
      <h2 className="text-2xl font-bold mb-2 dark:text-white">Timetable: {status.name}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Status: {status.status.toUpperCase()}</p>

      {status.status === "completed" ? (
        <div className="min-w-max">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center w-32 dark:text-white">Time \ Day</th>
                {daysOfWeek.map(day => (
                  <th key={day} className="border border-gray-300 dark:border-gray-600 p-2 text-center dark:text-white w-48">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot}>
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-center font-semibold bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
                    {slot}
                  </td>
                  {daysOfWeek.map(day => {
                    const cellEntries = getEntry(day, slot);
                    return (
                      <td key={`${day}-${slot}`} className="border border-gray-300 dark:border-gray-600 p-2 align-top">
                        {cellEntries.length > 0 ? (
                          <div className="space-y-2">
                            {cellEntries.map(entry => (
                              <div 
                                key={entry._id} 
                                onClick={() => setSelectedEntry(entry)}
                                className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <div className="font-bold text-blue-800 dark:text-blue-300">{entry.course.name}</div>
                                <div className="text-gray-600 dark:text-gray-400 text-xs">Faculty: {entry.faculty.name}</div>
                                <div className="text-gray-600 dark:text-gray-400 text-xs">Room: {entry.room.name}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-sm italic">- Free -</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-red-500">Cannot display grid. Timetable generation failed or is still pending.</div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Edit Entry / Suggestions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedEntry.timeSlot.dayOfWeek} at {selectedEntry.timeSlot.startTime} - {selectedEntry.timeSlot.endTime}
                </p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
              <h4 className="font-semibold mb-2 dark:text-gray-200">Current Slot Details</h4>
              <p className="text-sm dark:text-gray-300"><span className="font-medium">Course:</span> {selectedEntry.course.name}</p>
              <p className="text-sm dark:text-gray-300"><span className="font-medium">Faculty:</span> {selectedEntry.faculty.name}</p>
              <p className="text-sm dark:text-gray-300"><span className="font-medium">Room:</span> {selectedEntry.room.name}</p>
            </div>

            <h4 className="font-semibold mb-3 dark:text-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Smart Suggestions
            </h4>
            
            {suggestions.filter(s => s.timeSlot && s.timeSlot._id === selectedEntry.timeSlot._id).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.filter(s => s.timeSlot && s.timeSlot._id === selectedEntry.timeSlot._id).map((suggestion, idx) => (
                  <div key={idx} className="border dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-800 hover:border-blue-500 transition-colors shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-bl font-semibold">
                      Used {suggestion.frequency} times
                    </div>
                    <div className="mb-3">
                      <div className="font-bold text-gray-800 dark:text-gray-100 truncate" title={suggestion.course?.name}>{suggestion.course?.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">By {suggestion.faculty?.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">In {suggestion.room?.name}</div>
                    </div>
                    <button 
                      onClick={() => handleApplySuggestion(suggestion)}
                      disabled={updating}
                      className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 py-2 rounded font-medium transition-colors text-sm disabled:opacity-50"
                    >
                      {updating ? 'Applying...' : 'Apply Suggestion'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                No frequent suggestions found for this time slot.
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};
