import React from "react";
import { useToast } from "../hooks/useToast";

const ToastTest: React.FC = () => {
  const { toast } = useToast();

  const handleUndo = () => {
    alert("Action Undone!");
  };

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Toast Notification System Testing</h1>
      
      <div className="flex flex-col gap-2 max-w-sm">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => toast.success("Successfully saved changes!", { duration: 3000 })}
        >
          Test Success (3s)
        </button>

        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={() => toast.error("Failed to delete item.", { duration: 0 })}
        >
          Test Error (Persistent)
        </button>

        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => toast.info("New update available for your profile.")}
        >
          Test Info (Default 4s)
        </button>

        <button
          className="px-4 py-2 bg-yellow-500 text-white rounded"
          onClick={() => toast.warning("Your session is about to expire in 5 minutes.")}
        >
          Test Warning
        </button>

        <button
          className="px-4 py-2 bg-gray-500 text-white rounded"
          onClick={() => toast.default("System maintenance scheduled for midnight.")}
        >
          Test Default
        </button>

        <button
          className="px-4 py-2 bg-purple-500 text-white rounded"
          onClick={() =>
            toast.success("Item moved to trash.", {
              action: { label: "Undo", onClick: handleUndo },
              duration: 5000,
            })
          }
        >
          Test Action Button (5s)
        </button>
      </div>
    </div>
  );
};

export default ToastTest;
