import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useToast } from "../../hooks/useToast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage(res.data.message || "Email verified successfully!");
        toast.success("Email verified! You can now log in.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed. The token may be expired or invalid.");
        toast.error("Verification failed");
      }
    };

    verifyToken();
  }, [token, toast]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700 text-center">
          
          <div className="flex justify-center mb-6">
            {status === "loading" && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === "success" && (
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            )}
            {status === "error" && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {status === "loading" ? "Verifying Email" : status === "success" ? "Verification Successful" : "Verification Failed"}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {message}
          </p>

          <button
            onClick={() => navigate("/login")}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to Login
          </button>

        </div>
      </div>
    </div>
  );
}
