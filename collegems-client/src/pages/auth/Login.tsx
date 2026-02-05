import { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const res = await api.post("/auth/login", { email, password });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("role", res.data.user.role);

    const role = res.data.user.role;

    if (role === "student") navigate("/student/dashboard");
    if (role === "teacher") navigate("/teacher/dashboard");
    if (role === "hod") navigate("/hod/dashboard");
    if (role === "admin") navigate("/admin/dashboard");
  };

  return (
    <div className="p-10 max-w-sm mx-auto">
      <input
        className="border p-2 w-full mb-2"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="bg-black text-white px-4 py-2" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}
