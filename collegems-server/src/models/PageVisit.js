import mongoose from "mongoose";

const pageVisitSchema = new mongoose.Schema({
    page: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    role: {
        type: String,
        enum: ['admin', 'teacher', 'hod', 'student'],
        default: 'admin'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Create compound index for faster queries
pageVisitSchema.index({ page: 1, timestamp: -1 });

export default mongoose.model('PageVisit', pageVisitSchema);