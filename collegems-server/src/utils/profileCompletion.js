const calculateProfileCompletion = (user) => {
  const fields = [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "phone", label: "Phone Number" },
    { key: "studentId", label: "Student ID" },
    { key: "semester", label: "Semester" },
    { key: "course", label: "Course" },
  ];

  const missingFields = fields.filter((f) => !user[f.key]);

  const percentage = Math.round(
    ((fields.length - missingFields.length) / fields.length) * 100
  );

  return {
    percentage,
    missingFields: missingFields.map((f) => ({
      key: f.key,
      label: f.label,
    })),
  };
};

export default calculateProfileCompletion;