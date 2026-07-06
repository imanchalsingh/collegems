import PageVisit from "../models/PageVisit.js";

// Track page visit
export const trackPageVisit = async (req, res, next) => {
    try {
        const { page, role } = req.body;
        const userId = req.user?._id;

        await PageVisit.create({
            page,
            user: userId,
            role: role || 'admin',
            timestamp: new Date()
        });

        res.status(201).json({ success: true, message: 'Visit tracked' });
    } catch (error) {
        console.error('Track visit error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to track visit'
            }
        });
    }
};

// Get page visit metrics
export const getPageVisitMetrics = async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - parseInt(days));

        // Aggregate visits by page
        const metrics = await PageVisit.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' }
                }
            },
            {
                $project: {
                    page: '$_id',
                    visits: '$count',
                    uniqueUsers: { $size: '$uniqueUsers' },
                    _id: 0
                }
            },
            { $sort: { visits: -1 } },
            { $limit: parseInt(limit) }
        ]);

        // Get total visits
        const totalVisits = await PageVisit.countDocuments({
            timestamp: { $gte: dateLimit }
        });

        res.json({
            success: true,
            data: {
                metrics,
                summary: {
                    totalVisits,
                    uniquePages: metrics.length,
                    dateRange: `${days} days`
                }
            }
        });
    } catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get metrics'
            }
        });
    }
};

// Get visits by role
export const getVisitsByRole = async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - parseInt(days));

        const roleStats = await PageVisit.aggregate([
            {
                $match: {
                    timestamp: { $gte: dateLimit },
                    role: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    role: '$_id',
                    visits: '$count',
                    _id: 0
                }
            },
            { $sort: { visits: -1 } }
        ]);

        res.json({
            success: true,
            data: roleStats
        });
    } catch (error) {
        console.error('Get role stats error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get role statistics'
            }
        });
    }
};