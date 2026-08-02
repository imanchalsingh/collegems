import { getStudentMilestones } from "../services/milestone.service.js";

/**
 * Express controller to fetch student milestones.
 * @param {object} req - Express request.
 * @param {object} res - Express response.
 * @param {function} next - Express next middleware.
 */
export const getMilestones = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only students can access their academic timeline",
      });
    }

    const studentId = req.user.id;
    const { page = 1, limit = 20, category, status, sort = "desc" } = req.query;

    const result = await getStudentMilestones(studentId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      category,
      status,
      sort: sort === "asc" ? "asc" : "desc",
    });

    return res.status(200).json({
      success: true,
      milestones: result.milestones,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
