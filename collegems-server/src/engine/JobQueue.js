import EventEmitter from "events";
import Timetable from "../models/Timetable.model.js";
import { TimetableSolver } from "./TimetableSolver.js";

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  async addJob(timetableId) {
    this.queue.push(timetableId);
    console.log(`[JobQueue] Job added: ${timetableId}. Queue length: ${this.queue.length}`);
    this.processNext();
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const timetableId = this.queue.shift();

    try {
      console.log(`[JobQueue] Processing job: ${timetableId}`);
      
      // Update status to in-progress
      await Timetable.findByIdAndUpdate(timetableId, { status: "in-progress" });
      
      const startTime = Date.now();
      
      // Run the solver
      const solver = new TimetableSolver(timetableId);
      const result = await solver.solve();
      
      const endTime = Date.now();
      
      if (result.success) {
        await Timetable.findByIdAndUpdate(timetableId, {
          status: "completed",
          generationTimeMs: endTime - startTime,
          conflictReport: null,
        });
        console.log(`[JobQueue] Job completed successfully: ${timetableId}`);
      } else {
        await Timetable.findByIdAndUpdate(timetableId, {
          status: "failed",
          generationTimeMs: endTime - startTime,
          conflictReport: result.conflicts,
        });
        console.log(`[JobQueue] Job failed: ${timetableId}`, result.conflicts);
      }
    } catch (error) {
      console.error(`[JobQueue] Error processing job ${timetableId}:`, error);
      await Timetable.findByIdAndUpdate(timetableId, {
        status: "failed",
        conflictReport: { error: error.message },
      });
    } finally {
      this.isProcessing = false;
      this.emit("jobCompleted", timetableId);
      // Process next job in queue if any
      this.processNext();
    }
  }
}

// Export a singleton instance
export const jobQueue = new JobQueue();
