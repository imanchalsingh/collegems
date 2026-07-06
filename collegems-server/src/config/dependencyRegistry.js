export const dependencyMap = {
  Course: [
    {
      model: 'TimetableEntry',
      foreignKey: 'course',
      description: 'Timetable Entries'
    },
    {
      model: 'User',
      foreignKey: 'course',
      filter: { role: 'student' },
      description: 'Enrolled Students',
      valueResolver: (entity) => entity.name
    },
    {
      model: 'Syllabus',
      foreignKey: 'course',
      description: 'Syllabus Modules'
    }
  ],
  User: [
    {
      model: 'TimetableEntry',
      foreignKey: 'faculty',
      description: 'Assigned Classes'
    },
    {
      model: 'Course',
      foreignKey: 'teacher',
      description: 'Managed Courses'
    }
  ],
  Room: [
    {
      model: 'TimetableEntry',
      foreignKey: 'room',
      description: 'Scheduled Classes'
    }
  ]
};
