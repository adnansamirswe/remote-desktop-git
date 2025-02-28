"use client";

import { useState, useEffect } from 'react';
import { io } from "socket.io-client";

export default function ConnectionDebugger() {
  const [socketStatus, setSocketStatus] = useState("checking");
  const [errorDetails, setErrorDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  useEffect(() => {
    // Test the socket connection
    try {
      const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://remote-desktop-backend.onrender.com";
      console.log(`Testing connection to: ${socketURL}`);
      
      const socket = io(socketURL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        timeout: 5000
      });
      
      socket.on('connect', () => {
        console.log('Connection test successful');
        setSocketStatus("connected");
        
        // Test two-way communication
        socket.emit('ping', () => {
          console.log('Ping response received');
          setSocketStatus("verified");
        });
      });
      
      socket.on('connect_error', (err) => {
        console.error('Connection test failed:', err);
        setSocketStatus("error");
        setErrorDetails(`Error: ${err.message}`);
      });
      
      return () => {
        socket.disconnect();
      };
    } catch (err) {
      setSocketStatus("error");
      setErrorDetails(`Error creating socket: ${err.message}`);
    }
  }, []);

  // Status indicator content
  const statusInfo = {
    checking: { color: 'bg-yellow-500', text: 'Checking connection...' },
    connected: { color: 'bg-yellow-500', text: 'Connected to server' },
    verified: { color: 'bg-green-500', text: 'Server operational' },
    error: { color: 'bg-red-500', text: 'Connection failed' }
  };
  
  return (
    <div className={`fixed transition-all duration-300 ease-in-out ${isMinimized ? 'bottom-4 right-4' : 'bottom-8 right-8'} z-50`}>
      {isMinimized ? (
        <button 
          onClick={() => setIsMinimized(false)}
          className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center text-blue-500"
          title="Show connection status"
        >
          <div className={`h-3 w-3 rounded-full mr-1 ${statusInfo[socketStatus].color}`}></div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-72">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Connection Status</h3>
            <button 
              onClick={() => setIsMinimized(true)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className={`h-4 w-4 rounded-full ${statusInfo[socketStatus].color}`}></div>
              <span className="ml-3 font-medium">{statusInfo[socketStatus].text}</span>
            </div>
          </div>
          
          {socketStatus === "error" && (
            <>
              <button 
                onClick={() => setShowDetails(!showDetails)} 
                className="w-full text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline flex items-center justify-center"
              >
                {showDetails ? "Hide details" : "Show error details"}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDetails && errorDetails && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
                  <p className="font-medium mb-1">Error Details:</p>
                  <p className="font-mono overflow-x-auto whitespace-pre-wrap">{errorDetails}</p>
                </div>
              )}
            </>
          )}
          
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-1">Server: {process.env.NEXT_PUBLIC_SOCKET_URL || "https://remote-desktop-backend.onrender.com"}</p>
            <p>WebRTC connection relies on this signaling server</p>
          </div>
        </div>
      )}
    </div>
  );
}
