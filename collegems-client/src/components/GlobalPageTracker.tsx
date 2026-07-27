import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// Adjust this path if your SocketContext is in a different folder
import { useSocket } from '../context/SocketContext'; 

export default function GlobalPageTracker() {
  const location = useLocation();
  const { socket, isConnected } = useSocket(); 

  useEffect(() => {
    // Only emit if the socket exists AND has successfully connected
    if (socket && isConnected) {
      console.log("Sending page change to server:", location.pathname);
      
      // Match the backend event ('page_change') and pass exactly what it wants (the path string)
      socket.emit('page_change', location.pathname);
    }
  }, [location, socket, isConnected]);

  return null;
}