import mongoose from "mongoose";

const AssessmentConfigSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        unique: true
    },
    components: [{
        name: { type: String, required: true }, // e.g., 'Assignment', 'Quiz', 'Midterm'
        weightage: { type: Number, required: true, min: 0, max: 100 },
        maxMarks: { type: Number, required: true, min: 1 } // Max raw marks for this component
    }]
}, { timestamps: true });

AssessmentConfigSchema.pre('save', function() {
    const totalWeightage = this.components.reduce((sum, comp) => sum + comp.weightage, 0);
    if (totalWeightage !== 100) {
        throw new Error('Total weightage must equal 100%');
    }
});

export default mongoose.model("AssessmentConfig", AssessmentConfigSchema);
