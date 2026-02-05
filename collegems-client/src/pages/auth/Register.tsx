import { useState } from "react";
import api from "../../api/axios";

export default function Register() {
  const [role, setRole] = useState("student");
  const [form, setForm] = useState<any>({});

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    try {
      await api.post("/auth/register", { ...form, role });
      alert("Registered successfully");
    } catch (err: any) {
      alert(err.response?.data?.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-xl mb-4">Register</h2>

      <input className="border p-2 w-full mb-2" name="name" placeholder="Name" onChange={handleChange} />
      <input className="border p-2 w-full mb-2" name="email" placeholder="Email" onChange={handleChange} />
      <input className="border p-2 w-full mb-2" type="password" name="password" placeholder="Password" onChange={handleChange} />

      <select className="border p-2 w-full mb-2" onChange={(e) => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="hod">HOD</option>
        <option value="admin">Admin</option>
      </select>

      {role === "student" && (
        <input className="border p-2 w-full mb-2" name="studentId" placeholder="Student ID" onChange={handleChange} />
      )}

      {role === "teacher" && (
        <input className="border p-2 w-full mb-2" name="teacherId" placeholder="Teacher ID" onChange={handleChange} />
      )}

      {role === "hod" && (
        <input className="border p-2 w-full mb-2" name="departmentCode" placeholder="Department Code" onChange={handleChange} />
      )}

      {role === "admin" && (
        <input className="border p-2 w-full mb-2" name="adminSecret" placeholder="Admin Secret Key" onChange={handleChange} />
      )}

      <button className="bg-black text-white px-4 py-2 w-full" onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}
