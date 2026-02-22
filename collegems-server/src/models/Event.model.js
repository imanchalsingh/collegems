// A event organization ..
//  requirement like event name, description, date, time, location, organizer, attendees list, etc.
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    organizer: {
      type: String,
      required: true,
    },
    attendees: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);
export default Event;
