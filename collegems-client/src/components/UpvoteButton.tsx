import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import api from "../api/axios"; // adjust the path to your axios instance

interface UpvoteButtonProps {
  resourceId: string;
  initialCount?: number;
  initialIsUpvoted?: boolean;
  resourceType?: "assignment" | "note" | "material";
}

export default function UpvoteButton({
  resourceId,
  initialCount = 0,
  initialIsUpvoted = false,
  resourceType = "material",
}: UpvoteButtonProps) {
  const [count, setCount] = useState<number>(initialCount);
  const [isUpvoted, setIsUpvoted] = useState<boolean>(initialIsUpvoted);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleToggleUpvote = async () => {
    if (isUpdating) return;

    // 1. Optimistic Update (instant feedback for the user)
    const nextState = !isUpvoted;
    const nextCount = nextState ? count + 1 : Math.max(0, count - 1);

    setIsUpvoted(nextState);
    setCount(nextCount);
    setIsUpdating(true);

    try {
await api.post(`/${resourceType}/${resourceId}/upvote`, {
  upvoted: nextState,
});
    } catch (err) {
      console.error("Failed to update helpful status:", err);
      // Revert state if server request fails
      setIsUpvoted(!nextState);
      setCount(count);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggleUpvote}
      disabled={isUpdating}
      title={isUpvoted ? "Remove helpful vote" : "Mark as helpful"}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border
        ${
          isUpvoted
            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
        }
        disabled:opacity-70 disabled:cursor-not-allowed
      `}
    >
      <ThumbsUp
        className={`w-3.5 h-3.5 transition-transform ${
          isUpvoted ? "fill-blue-600 text-blue-600 scale-110" : "text-gray-500"
        }`}
      />
      <span>{count > 0 ? `${count} Helpful` : "Helpful"}</span>
    </button>
  );
}