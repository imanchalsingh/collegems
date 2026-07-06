import React from "react";

export default function TimetableGrid() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const slots = [
    "9:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 1:00",
    "2:00 - 3:00",
  ];
  // Sample timetable data.
// This can later be replaced with API data from the backend.
  const timetableData: Record<
    string,
    Record<
      string,
      {
        subject: string;
        faculty: string;
        room: string;
      }
    >
  > = {
    Monday: {
      "9:00 - 10:00": {
        subject: "Mathematics",
        faculty: "Dr. Sharma",
        room: "A101",
      },
      "10:00 - 11:00": {
        subject: "Physics",
        faculty: "Dr. Rao",
        room: "B203",
      },
    },
    Tuesday: {
      "9:00 - 10:00": {
        subject: "Data Structures",
        faculty: "Prof. Kumar",
        room: "Lab-1",
      },
      "11:00 - 12:00": {
        subject: "Database Systems",
        faculty: "Prof. Mehta",
        room: "C105",
      },
    },
    Wednesday: {
      "10:00 - 11:00": {
        subject: "Operating Systems",
        faculty: "Dr. Gupta",
        room: "B201",
      },
    },
    Thursday: {
      "12:00 - 1:00": {
        subject: "Computer Networks",
        faculty: "Prof. Singh",
        room: "A302",
      },
    },
    Friday: {
      "2:00 - 3:00": {
        subject: "Software Engineering",
        faculty: "Dr. Patel",
        room: "C210",
      },
    },
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="grid grid-cols-6 min-w-[900px]">
        <div className="border-b border-r border-gray-200 dark:border-gray-700 p-4 font-semibold text-gray-700 dark:text-gray-300">
          Time
        </div>

        {days.map((day) => (
          <div
            key={day}
            className="border-b border-r border-gray-200 dark:border-gray-700 p-4 text-center font-semibold text-gray-700 dark:text-gray-300"
          >
            {day}
          </div>
        ))}

        {slots.map((slot) => (
          <React.Fragment key={slot}>
            <div className="border-b border-r border-gray-200 dark:border-gray-700 p-4 font-medium text-gray-600 dark:text-gray-400">
              {slot}
            </div>

            {days.map((day) => {
              const entry = timetableData[day]?.[slot];

              return (
                <div
                  key={`${day}-${slot}`}
                  className="border-b border-r border-gray-200 dark:border-gray-700 p-3 min-h-[100px]"
                >
                  {entry ? (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 h-full">
                      <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                        {entry.subject}
                      </h3>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {entry.faculty}
                      </p>

                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Room: {entry.room}
                      </p>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      Free Slot
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}