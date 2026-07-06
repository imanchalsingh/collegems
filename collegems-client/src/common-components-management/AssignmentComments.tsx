import React, { useState } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import api from "../api/axios";
import { useAutoSave } from "../hooks/useAutoSave";

export interface CommentUser {
  _id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  photo?: string;
}

export interface Comment {
  _id: string;
  text: string;
  user: CommentUser;
  createdAt: string;
}

interface AssignmentCommentsProps {
  assignmentId: string;
  initialComments?: Comment[];
}

export default function AssignmentComments({ assignmentId, initialComments = [] }: AssignmentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save hook
  useAutoSave(`comment_draft_${assignmentId}`, newComment, setNewComment);

  // CRITICAL SAFETY CHECK: Ensures we ALWAYS have a string, even if localStorage loads garbage/objects
  const safeComment = typeof newComment === "string" ? newComment : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safely check the string
    if (!safeComment.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/assignment/${assignmentId}/comments`, {
        text: safeComment,
      });
      
      if (res.data.success) {
        setComments(res.data.data);
        setNewComment(""); // Clear the text box
        
        // Clear the local storage draft after successful submission
        localStorage.removeItem(`comment_draft_${assignmentId}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Discussion ({comments.length})
        </h3>
      </div>

      {/* Comment List */}
      <div className="space-y-5 mb-6 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[200px]">
        {comments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No questions yet. Be the first to start the discussion!
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isTeacher = comment.user?.role === "teacher" || comment.user?.role === "hod";
            const avatar = comment.user?.avatarUrl || comment.user?.photo;

            return (
              <div key={comment._id} className="flex gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={comment.user?.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isTeacher 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {getInitials(comment.user?.name)}
                    </div>
                  )}
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {comment.user?.name || "Unknown User"}
                    </span>
                    {isTeacher && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        TEACHER
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm inline-block w-full break-words ${
                    isTeacher 
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100 border border-blue-100 dark:border-blue-800' 
                      : 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700'
                  }`}>
                    {comment.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative shrink-0 mt-auto">
        {error && (
          <div className="mb-2 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <textarea
            value={safeComment} // Uses the safely parsed string
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or add a clarification..."
            className="w-full pl-4 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!safeComment.trim() || isSubmitting} // Safely checks the string
            className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
