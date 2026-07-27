import mongoose from "mongoose";
import snapshotPlugin from "../plugins/snapshotPlugin.js";
import { isValidDateFormat, isValidDateRange, isValidDate, formatDate } from "../utils/dateValidators.js";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Student ID is required']
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, 'Course ID is required']
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      validate: {
        validator: function(value) {
          // Use imported isValidDate with options
          const result = isValidDate(value, {
            minDate: '2000-01-01',
            maxDate: '2100-12-31'
          });
          return result.valid;
        },
        message: function(props) {
          const value = props.value;
          const result = isValidDate(value, {
            minDate: '2000-01-01',
            maxDate: '2100-12-31'
          });
          
          if (!result.valid) {
            return result.error || 'Invalid date format';
          }
          
          if (!isValidDateFormat(value)) {
            return 'Date must be in YYYY-MM-DD format (e.g., 2024-01-01)';
          }
          
          if (!isValidDateRange(value)) {
            return 'Date must be between 2000-01-01 and 2100-12-31';
          }
          
          return 'Invalid date format';
        }
      }
    },
    status: {
      type: String,
      enum: {
        values: ["present", "absent"],
        message: 'Status must be present or absent'
      },
      required: [true, 'Status is required']
    }
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────────────────────────────────────

attendanceSchema.index(
  { student: 1, course: 1, date: 1 },
  { unique: true }
);

attendanceSchema.index({ course: 1, date: -1 });
attendanceSchema.index({ student: 1, date: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// PLUGINS
// ─────────────────────────────────────────────────────────────────────────────

attendanceSchema.plugin(snapshotPlugin);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────────────────────────────────────

attendanceSchema.statics.getAttendanceByDate = function(courseId, date) {
    // Validate date using imported utility
    if (!isValidDateFormat(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    return this.find({ course: courseId, date });
};

attendanceSchema.statics.getAttendanceByStudent = function(studentId, startDate, endDate) {
    const query = { student: studentId };
    
    // Validate dates using imported utilities
    if (startDate) {
        if (!isValidDateFormat(startDate)) {
            throw new Error('Invalid startDate format. Use YYYY-MM-DD');
        }
        query.date = { $gte: startDate };
    }
    
    if (endDate) {
        if (!isValidDateFormat(endDate)) {
            throw new Error('Invalid endDate format. Use YYYY-MM-DD');
        }
        query.date = { ...query.date, $lte: endDate };
    }
    
    return this.find(query);
};

attendanceSchema.statics.getAttendanceStats = function(courseId, startDate, endDate) {
    const query = { course: courseId };
    
    // Validate dates using imported utilities
    if (startDate) {
        if (!isValidDateFormat(startDate)) {
            throw new Error('Invalid startDate format. Use YYYY-MM-DD');
        }
        query.date = { $gte: startDate };
    }
    
    if (endDate) {
        if (!isValidDateFormat(endDate)) {
            throw new Error('Invalid endDate format. Use YYYY-MM-DD');
        }
        query.date = { ...query.date, $lte: endDate };
    }
    
    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};
// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

// Re-export utilities for backward compatibility
export { isValidDateFormat, isValidDateRange } from "../utils/dateValidators.js";