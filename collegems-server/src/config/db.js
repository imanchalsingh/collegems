import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import timezonePlugin from "../plugins/timezonePlugin.js";

let mongoServer;

export const connectDB = async () => {
  try {
    mongoose.plugin(timezonePlugin);

    if (process.env.USE_MEMORY_DB === "true") {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`🧠 MongoDB Memory Server Connected: ${mongoUri}`);
    } else {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB Connected");
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
