import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import "quill/dist/quill.snow.css";
import { useSocket } from "../../context/SocketContext";
import { History } from "lucide-react";
import VersionHistorySidebar from "./VersionHistorySidebar";

Quill.register("modules/cursors", QuillCursors);

export default function CollaborativeEditor({ groupId }: { groupId: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!editorRef.current || !socket || !isConnected) return;

    // Initialize Yjs Document
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("quill-editor");

    // Initialize Quill Editor with cursors module
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        cursors: true,
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          ["code-block"]
        ]
      }
    });

    // Initialize Awareness Protocol
    const awareness = new Awareness(ydoc);
    const userName = localStorage.getItem("name") || `User-${Math.floor(Math.random() * 1000)}`;
    const userColor = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    
    awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    // Bind Yjs to Quill
    const binding = new QuillBinding(ytext, quill, awareness);

    // Broadcast local document changes
    ydoc.on("update", (update: Uint8Array, origin: any) => {
      if (origin !== "network") {
        socket.emit("sync-update", { groupId, update: Array.from(update) });
      }
    });

    // Broadcast awareness changes
    awareness.on("update", ({ added, updated, removed }: any) => {
      const changedClients = [...added, ...updated, ...removed];
      const update = encodeAwarenessUpdate(awareness, changedClients);
      socket.emit("awareness-update", { groupId, update: Array.from(update) });
    });

    // Apply remote document changes
    const handleRemoteUpdate = (updateArray: number[]) => {
      const update = new Uint8Array(updateArray);
      Y.applyUpdate(ydoc, update, "network");
    };

    // Apply initial state
    const handleInitialState = (updateArray: number[]) => {
      const update = new Uint8Array(updateArray);
      Y.applyUpdate(ydoc, update, "network");
    };

    // Apply remote awareness changes
    const handleAwarenessUpdate = (updateArray: number[]) => {
      const update = new Uint8Array(updateArray);
      applyAwarenessUpdate(awareness, update, "network");
    };

    socket.on("sync-update", handleRemoteUpdate);
    socket.on("sync-initial-state", handleInitialState);
    socket.on("awareness-update", handleAwarenessUpdate);

    // Prompt server to send initial state and join the document context
    // The server emits "sync-initial-state" automatically upon "join-group", 
    // but we listen for it here.

    return () => {
      socket.off("sync-update", handleRemoteUpdate);
      socket.off("sync-initial-state", handleInitialState);
      socket.off("awareness-update", handleAwarenessUpdate);
      awareness.destroy();
      binding.destroy();
      quill.disable();
    };
  }, [groupId, socket, isConnected]);

  const handleRestore = () => {
    // Reload to re-fetch the initial state from the server after a restore
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm relative overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center z-10 relative">
        <h3 className="font-semibold text-gray-700">Collaborative Document</h3>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <History className="w-4 h-4" />
          Version History
        </button>
      </div>
      <div className="flex-1 bg-white h-full relative p-4 overflow-hidden">
        {/* The editor container */}
        <div ref={editorRef} style={{ height: 'calc(100% - 42px)' }} />
      </div>

      <VersionHistorySidebar
        groupId={groupId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onRestore={handleRestore}
      />
    </div>
  );
}
