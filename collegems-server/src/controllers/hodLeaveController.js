import Leave from '../models/Leave.model.js'; 

export const getHODLeaveDashboardData = async (req, res) => {
  try {
    const totalPending = await Leave.countDocuments({ status: 'Pending' });
    const totalApproved = await Leave.countDocuments({ status: 'Approved' });

    const pendingRequests = await Leave.find({ status: 'Pending' })
      .populate('user', 'name email studentId course') 
      .sort({ createdAt: 1 })
      .limit(10); 

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const recentHistory = await Leave.find({ 
      status: 'Approved',
      updatedAt: { $gte: startOfMonth }
    })
      .populate('user', 'name email studentId course')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      summary: { pending: totalPending, approved: totalApproved },
      pendingRequests,
      recentHistory
    });

  } catch (error) {
    console.error("Dashboard Data Error:", error);
    res.status(500).json({ message: "Error fetching HOD dashboard data" });
  }
};

export const overrideLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status } = req.body; 
    const hodId = req.user?.id; 

    const leave = await Leave.findById(leaveId);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    leave.status = status;
    leave.adminRemarks = "Overridden by HOD";
    leave.reviewedBy = hodId;
    leave.reviewedAt = new Date();
    await leave.save();

    res.status(200).json({ message: `Leave successfully ${status}`, leave });
  } catch (error) {
    console.error("Override Error:", error);
    res.status(500).json({ message: "Error overriding leave status" });
  }
};