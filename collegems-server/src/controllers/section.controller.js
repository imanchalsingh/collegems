import User from '../models/user.model.js'; 
import Attendance from '../models/attendance.model.js';
import Timetable from '../models/timetable.model.js';
import Class from '../models/classes.model.js'; 

export const bulkRenameSections = async (req, res) => {
    // Removed transaction session start
    try {
        const { updates } = req.body; 

        for (const { oldName, newName } of updates) {
            
            // 1. Update the Class name (removed { session })
            await Class.updateMany(
                { name: oldName }, 
                { name: newName }
            );

            // 2. Cascade update User, Attendance, and Timetable (removed { session })
            await User.updateMany({ section: oldName }, { section: newName });
            await Attendance.updateMany({ section: oldName }, { section: newName });
            await Timetable.updateMany({ section: oldName }, { section: newName });
        }

        // Removed session.commitTransaction()
        res.status(200).json({ success: true, message: "Sections renamed successfully across all records!" });
    } catch (error) {
        // Removed session.abortTransaction()
        res.status(400).json({ success: false, message: error.message });
    } 
    // Removed finally { session.endSession(); }
};