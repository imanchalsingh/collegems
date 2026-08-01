import { createEvent } from "ics";

/**
 * Build an iCalendar (.ics) string for a mentorship session.
 * @returns {Promise<string>}
 */
export function buildMentorshipIcs({
  title,
  description,
  location,
  start,
  end,
  organizer,
  attendees = [],
}) {
  return new Promise((resolve, reject) => {
    const startArr = [
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate(),
      start.getHours(),
      start.getMinutes(),
    ];
    const endArr = [
      end.getFullYear(),
      end.getMonth() + 1,
      end.getDate(),
      end.getHours(),
      end.getMinutes(),
    ];

    createEvent(
      {
        start: startArr,
        end: endArr,
        title: title || "Mentorship / Tutoring Session",
        description: description || "",
        location: location || "",
        status: "CONFIRMED",
        busyStatus: "BUSY",
        organizer: organizer?.email
          ? { name: organizer.name || "Mentor", email: organizer.email }
          : undefined,
        attendees: attendees
          .filter((a) => a?.email)
          .map((a) => ({
            name: a.name || a.email,
            email: a.email,
            rsvp: true,
            partstat: "NEEDS-ACTION",
            role: "REQ-PARTICIPANT",
          })),
        productId: "collegems/mentorship",
      },
      (error, value) => {
        if (error) reject(error);
        else resolve(value);
      }
    );
  });
}

export function icsAttachment(icsString, filename = "mentorship-session.ics") {
  return {
    filename,
    content: icsString,
    contentType: "text/calendar; charset=utf-8; method=REQUEST",
  };
}
