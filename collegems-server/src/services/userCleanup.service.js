import User from '../models/User.model.js';
import TimetableEntry from '../models/TimetableEntry.model.js';
import Course from '../models/Course.model.js';

export const getCleanupSuggestions = async (thresholdDays = 180) => {
  const suggestions = [];
  const now = new Date();
  
  // A buffer of 7 days to avoid flagging brand new accounts that haven't logged in yet
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const thresholdDate = new Date(now.getTime() - (thresholdDays * 24 * 60 * 60 * 1000));

  // 1. Ghost Accounts (Never logged in AND created > 7 days ago)
  const ghostUsers = await User.find({
    loginCount: 0,
    createdAt: { $lt: sevenDaysAgo }
  });

  for (const user of ghostUsers) {
    suggestions.push({
      userId: user._id,
      name: user.name,
      role: user.role,
      reason: 'NEVER_LOGGED_IN',
      lastLogin: null,
      recommendedAction: 'ARCHIVE_ACCOUNT',
      details: `Account was created on ${user.createdAt.toLocaleDateString()} but has never been accessed.`
    });
  }

  // 2. Stale Accounts (Inactive for > thresholdDays)
  const staleUsers = await User.find({
    accountStatus: 'active',
    lastLogin: { $lt: thresholdDate }
  });

  for (const user of staleUsers) {
    suggestions.push({
      userId: user._id,
      name: user.name,
      role: user.role,
      reason: 'INACTIVE_180_DAYS',
      lastLogin: user.lastLogin,
      recommendedAction: 'ARCHIVE_ACCOUNT',
      details: `Account has been inactive since ${user.lastLogin.toLocaleDateString()}.`
    });
  }

  // 3. Archived but Assigned Accounts
  const archivedUsers = await User.find({ accountStatus: 'archived' });
  
  for (const user of archivedUsers) {
    let hasLingeringAssignments = false;
    const assignments = [];

    // Check if an archived teacher is still assigned to a timetable entry
    if (user.role === 'teacher') {
      const timetableCount = await TimetableEntry.countDocuments({ faculty: user._id });
      if (timetableCount > 0) {
        hasLingeringAssignments = true;
        assignments.push(`${timetableCount} Timetable Entries`);
      }

      const courseCount = await Course.countDocuments({ teacher: user._id });
      if (courseCount > 0) {
        hasLingeringAssignments = true;
        assignments.push(`${courseCount} Courses`);
      }
    }

    if (hasLingeringAssignments) {
      suggestions.push({
        userId: user._id,
        name: user.name,
        role: user.role,
        reason: 'ARCHIVED_BUT_ASSIGNED',
        lastLogin: user.lastLogin,
        recommendedAction: 'REASSIGN_RESOURCES',
        details: `User is archived but still assigned to: ${assignments.join(', ')}.`
      });
    }
  }

  return suggestions;
};
