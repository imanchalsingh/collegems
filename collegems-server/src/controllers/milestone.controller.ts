import { Request, Response, NextFunction } from "express";
import { getStudentMilestones } from "../services/milestone.service.js";

// Extend Express Request type locally if needed, but casting to 'any' is safe and compatible.
export const getMilestones = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only students can access their academic timeline",
      });
    }

    const studentId = user.id;
    const { page = 1, limit = 20, category, status, sort = "desc" } = req.query;

    const result = await getStudentMilestones(studentId, {
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 20,
      category: category as string,
      status: status as string,
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
