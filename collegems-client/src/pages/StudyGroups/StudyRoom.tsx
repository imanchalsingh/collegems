import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import ChatBox from "../../components/StudyGroups/ChatBox";
import CollaborativeEditor from "../../components/StudyGroups/CollaborativeEditor";
import { Users, ArrowLeft } from "lucide-react";

export default function StudyRoom() {
  const { id } = useParams<{ id: string }>();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id || !socket || !isConnected) return;

    // Join the room
    socket.emit("join-group", id);

    const handleUserJoined = ({ userId }: { userId: string }) => {
      setActiveUsers((prev) => new Set(prev).add(userId));
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      setActiveUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleActiveUsers = (userIds: string[]) => {
      setActiveUsers(new Set(userIds));
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("active-users", handleActiveUsers);

    return () => {
      socket.emit("leave-group", id);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("active-users", handleActiveUsers);
    };
  }, [id, socket, isConnected]);

  if (!id) return <div>Invalid Room ID</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-6 max-w-[1400px] mx-auto gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/study-groups")}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Study Room</h1>
            <p className="text-sm text-gray-500">Collaborating in real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-medium">
          <Users size={18} />
          <span>{activeUsers.size + 1} Online</span> {/* +1 for self */}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        {/* Collaborative Editor Area */}
        <div className="flex-1 min-w-0">
          <CollaborativeEditor groupId={id} />
        </div>

        {/* Chat Area */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
          <ChatBox groupId={id} />
        </div>
      </div>
    </div>
  );
}
