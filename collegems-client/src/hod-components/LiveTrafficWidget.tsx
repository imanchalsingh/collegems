import React, { useState, useEffect } from 'react';
// IMPORTANT: Adjust this path to wherever your SocketContext is
import { useSocket } from '../context/SocketContext'; 

interface TrafficData {
    students: number;
    teachers: number;
    activePages?: Record<string, number>; // Made optional since backend doesn't send it yet
}

const LiveTrafficWidget: React.FC = () => {
    const { socket, isConnected } = useSocket();
    const [traffic, setTraffic] = useState<TrafficData>({ 
        students: 0, 
        teachers: 0, 
        activePages: {} 
    });

    useEffect(() => {
        console.log("Widget checking socket status:", { 
            hasSocket: !!socket, 
            isConnected: isConnected 
        });

        if (!socket || !isConnected) {
            console.log("Widget is NOT listening yet. Waiting for socket...");
            return;
        }

        console.log("Widget is NOW LISTENING for live_traffic_update!");

        socket.on('live_traffic_update', (data) => {
            console.log("🚨 INCOMING SOCKET DATA:", data);
            setTraffic(data);
        });

        return () => {
            console.log("Widget stopped listening.");
            socket.off('live_traffic_update');
        };
    }, [socket, isConnected]);

    // Safely extract data with fallbacks so a missing backend field never causes a crash
    const students = traffic?.students || 0;
    const teachers = traffic?.teachers || 0;
    const totalActive = students + teachers;
    
    // 🔥 THE FIX: If the backend forgets to send activePages, fallback to an empty object
    const safeActivePages = traffic?.activePages || {};

    return (
        <div className="p-4 bg-white rounded-lg shadow-md border border-gray-100">
            <h3 className="font-bold text-lg text-red-500 flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                Live Traffic ({totalActive} Online)
            </h3>
            
            <div className="flex gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg flex-1 border border-blue-100">
                    <p className="text-sm text-blue-600 font-semibold">Students</p>
                    <p className="text-3xl font-bold text-blue-900">{students}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg flex-1 border border-green-100">
                    <p className="text-sm text-green-600 font-semibold">Teachers</p>
                    <p className="text-3xl font-bold text-green-900">{teachers}</p>
                </div>
            </div>

            <div>
                <p className="text-sm text-gray-500 font-semibold mb-3 border-b pb-2">Most Active Pages</p>
                <ul className="text-sm text-gray-700 space-y-2">
                    {Object.entries(safeActivePages)
                        .sort(([, a], [, b]) => b - a) // Sort by highest traffic
                        .slice(0, 5) // Show top 5 pages
                        .map(([page, count]) => (
                            <li key={page} className="flex justify-between items-center py-1">
                                <span className="truncate pr-4 text-gray-600 font-mono text-xs">{page}</span>
                                <span className="font-bold bg-gray-100 px-2 py-1 rounded-md text-xs">{count}</span>
                            </li>
                        ))}
                    {Object.keys(safeActivePages).length === 0 && (
                        <li className="text-gray-400 italic text-center py-2">No active page data yet</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default LiveTrafficWidget;