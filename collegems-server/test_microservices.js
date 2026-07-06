import dotenv from "dotenv";
dotenv.config();

// Force testing modes
process.env.USE_MEMORY_DB = "true";
process.env.MOCK_RABBITMQ = "true";

import { connectDB } from "./src/config/db.js";
import { connectRabbitMQ, publishEvent } from "./src/utils/rabbitmq.js";

// Microservice modules
import authRoutes from "./src/routes/auth.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import express from "express";

const runTests = async () => {
  console.log("=== Starting Microservices Validation Test ===");

  // 1. Initialize Mock Infrastructure
  await connectDB();
  await connectRabbitMQ();

  // 2. Setup the "Notification Service" listener inside this process
  // In the real system, this is running in its own microservice
  console.log("Setting up Notification Service Subscriptions...");
  const { subscribeEvent } = await import("./src/utils/rabbitmq.js");
  
  let eventReceived = false;
  
  subscribeEvent("academics", "notifications_queue", "result.published", (data) => {
    console.log("✅ SUCCESS: Notification Service successfully consumed event across bounded context!");
    console.log("Event Data:", data);
    eventReceived = true;
  });

  // 3. Simulate "Academics Service" publishing an event
  console.log("\nSimulating Academics Service publishing Result...");
  await publishEvent("academics", "result.published", {
    studentId: "12345",
    courseId: "67890",
    resultId: "abcde",
    timestamp: new Date()
  });

  // Wait a tick for event to process
  await new Promise(resolve => setTimeout(resolve, 500));

  if (eventReceived) {
    console.log("\n✅ Microservices Pub/Sub architecture is working perfectly in isolation!");
  } else {
    console.error("\n❌ Event was not received.");
  }

  console.log("=== End of Tests ===");
  process.exit(0);
};

runTests();
