import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

import Resource from "./src/models/Resource.model.js";

async function run() {
  await Resource.insertMany([
    { name: "Room 101", type: "classroom", capacity: 50, location: "Building A", status: "active" },
    { name: "Lab 202", type: "lab", capacity: 30, location: "Building B", status: "active" },
    { name: "Seminar Hall", type: "seminar_hall", capacity: 150, location: "Main Building", status: "active" }
  ]);
  console.log("Resources seeded!");
  process.exit(0);
}
run();
