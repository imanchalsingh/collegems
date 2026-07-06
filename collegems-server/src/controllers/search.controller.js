import User from "../models/User.model.js";
import Course from "../models/Course.model.js";
import Announcement from "../models/Announcement.model.js";
import Assignment from "../models/Assignment.model.js";

const getMatchReason = (doc, query, fields) => {
  const q = query.toLowerCase();
  for (const field of fields) {
    if (doc[field] && String(doc[field]).toLowerCase().includes(q)) {
      const fieldName = field === 'studentId' ? 'Student ID' : 
                        field === 'teacherId' ? 'Teacher ID' : 
                        field.charAt(0).toUpperCase() + field.slice(1);
      return `Matched by ${fieldName}`;
    }
  }
  return 'Matched by relevance';
};

// @desc    Global Search
// @route   GET /api/search?q=query
// @access  Private
export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const user = req.user; // from auth middleware
    const role = user?.role || "student";
    
    // We limit results for performance
    const LIMIT = 5;

    // Build base regex for case-insensitive search
    const regex = new RegExp(q, 'i');

    // 1. Search Users (Students/Faculty)
    // RBAC: Students can only search faculty/teachers. Teachers/Admins can search anyone.
    let userQuery = {
      $or: [
        { name: regex },
        { email: regex },
        { studentId: regex },
        { teacherId: regex }
      ]
    };
    if (role === "student") {
      userQuery.role = { $in: ["teacher", "hod"] };
    }
    
    // 2. Search Courses
    // RBAC: Everyone can search courses
    const courseQuery = {
      $or: [
        { name: regex },
        { code: regex },
        { department: regex }
      ]
    };

    // 3. Search Announcements
    // RBAC: Everyone can search announcements, but they should filter by their targetRole/targetCourse
    let announcementQuery = {
      $or: [
        { title: regex },
        { message: regex }
      ],
      isActive: true
    };
    if (role === "student") {
      announcementQuery.$and = [
        { 
          $or: [
            { targetRole: "all" }, 
            { targetRole: "student" },
            { targetRole: null }
          ]
        }
      ];
    } else if (role === "teacher") {
      announcementQuery.$and = [
        { 
          $or: [
            { targetRole: "all" }, 
            { targetRole: "teacher" },
            { targetRole: null }
          ]
        }
      ];
    }

    // 4. Search Assignments
    // RBAC: Students can search all assignments (or we restrict by course later)
    // Teachers search their own or all
    let assignmentQuery = {
      $or: [
        { title: regex },
        { description: regex }
      ]
    };

    // Execute queries in parallel
    const [usersData, coursesData, announcementsData, assignmentsData] = await Promise.all([
      User.find(userQuery).select('-password -settings').limit(LIMIT).lean(),
      Course.find(courseQuery).limit(LIMIT).lean(),
      Announcement.find(announcementQuery).limit(LIMIT).lean(),
      Assignment.find(assignmentQuery).limit(LIMIT).lean()
    ]);

    const users = usersData.map(doc => ({
      ...doc,
      matchReason: getMatchReason(doc, q, ['name', 'email', 'studentId', 'teacherId'])
    }));
    const courses = coursesData.map(doc => ({
      ...doc,
      matchReason: getMatchReason(doc, q, ['name', 'code', 'department'])
    }));
    const announcements = announcementsData.map(doc => ({
      ...doc,
      matchReason: getMatchReason(doc, q, ['title', 'message'])
    }));
    const assignments = assignmentsData.map(doc => ({
      ...doc,
      matchReason: getMatchReason(doc, q, ['title', 'description'])
    }));

    res.status(200).json({
      success: true,
      data: {
        users,
        courses,
        announcements,
        assignments
      }
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Server Error during search" });
  }
};
