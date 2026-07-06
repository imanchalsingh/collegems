import React, { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { getChatHistory } from "../../api/studyGroup.api";
import { useSocket } from "../../context/SocketContext";

export default function ChatBox({ groupId }: { groupId: string }) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    fetchHistory();
    if (socket && isConnected) {
      socket.on("receive-message", (message) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });
      socket.on("typing", ({ userName }) => {
        setTypingUsers((prev) => new Set(prev).add(userName));
      });
      socket.on("stop-typing", ({ userName }) => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userName);
          return newSet;
        });
      });
    }
    return () => {
      if (socket) {
        socket.off("receive-message");
        socket.off("typing");
        socket.off("stop-typing");
      }
    };
  }, [groupId, socket, isConnected]);

  const fetchHistory = async () => {
    try {
      const history = await getChatHistory(groupId);
      setMessages(history);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load chat history", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    
    socket.emit("send-message", { groupId, content: newMessage });
    
    const userStr = localStorage.getItem("user");
    let userName = "A user";
    if (userStr) {
      try { userName = JSON.parse(userStr).name; } catch (e) {}
    }
    socket.emit("stop-typing", { groupId, userName });
    setNewMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (socket) {
      const userStr = localStorage.getItem("user");
      let userName = "A user";
      if (userStr) {
        try { userName = JSON.parse(userStr).name; } catch (e) {}
      }
      socket.emit("typing", { groupId, userName });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { groupId, userName });
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-700">Live Chat</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{msg.senderId?.name || "User"}</span>
            <div className="bg-blue-50 text-gray-800 p-3 rounded-lg rounded-tl-none self-start max-w-[85%]">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 italic bg-gray-50/50">
          {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
        </div>
      )}

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 flex items-center justify-center transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
