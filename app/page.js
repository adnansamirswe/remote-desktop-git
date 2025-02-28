"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { io } from "socket.io-client";

export default function Dashboard() {
  const [connectionId, setConnectionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [socketStatus, setSocketStatus] = useState("checking");
  
  // Generate a random connection ID
  const generateConnectionId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create a new session as host
  const createNewSession = () => {
    const newId = generateConnectionId();
    setConnectionId(newId);
    navigator.clipboard.writeText(newId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Test the socket connection
  useEffect(() => {
    const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    console.log(`Testing socket connection to: ${socketURL}`);
    
    const socket = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 5000
    });
    
    socket.on('connect', () => {
      console.log('Socket connection test successful');
      setSocketStatus("connected");
      
      // Send a ping to verify two-way communication
      socket.emit('ping', () => {
        console.log('Ping response received - server is fully operational');
      });
      
      // Disconnect after successful test
      setTimeout(() => {
        socket.disconnect();
      }, 2000);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection test failed:', err);
      setSocketStatus("error");
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Remote Desktop Tool</h1>
          <p className="text-xl md:text-2xl opacity-90">
            Share your screen or control a remote computer securely through your browser
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 py-12 px-8">
        <div className="max-w-4xl mx-auto">
          {socketStatus === "error" && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded shadow-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-bold">Signaling Server Error</p>
                  <p className="text-sm">
                    Check that the server is running at{' '}
                    <code className="bg-red-50 px-1 py-0.5 rounded">{process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"}</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Host Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-blue-600 p-4">
                <h2 className="text-white text-xl font-semibold">Share Your Screen</h2>
                <p className="text-blue-100 text-sm">Become a host and share your screen</p>
              </div>
              <div className="p-6">
                <button
                  onClick={createNewSession}
                  disabled={socketStatus === "error"}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-lg font-medium transition duration-200 ease-in-out transform hover:scale-[1.02] flex items-center justify-center gap-2 mb-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Generate Connection ID
                </button>
                
                {connectionId && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-600 dark:text-gray-300 mb-1">Connection ID</label>
                      <div className="flex items-center">
                        <div className="flex-1 font-mono bg-gray-100 dark:bg-gray-700 py-2 px-3 rounded-l-lg border-2 border-r-0 border-gray-200 dark:border-gray-600">
                          {connectionId}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(connectionId);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 py-2 px-3 rounded-r-lg border-2 border-gray-200 dark:border-gray-600"
                        >
                          {copied ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/host?id=${connectionId}`}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition duration-200 ease-in-out flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Start Secure Session
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Viewer Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-purple-600 p-4">
                <h2 className="text-white text-xl font-semibold">View Remote Screen</h2>
                <p className="text-purple-100 text-sm">Connect to a shared screen</p>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="text-sm text-gray-600 dark:text-gray-300 mb-1 block">Connection ID</label>
                  <input
                    type="text"
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value.toUpperCase())}
                    placeholder="Enter Connection ID (e.g., A1B2C3)"
                    className="w-full border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <Link
                  href={connectionId ? `/view?id=${connectionId}` : "#"}
                  onClick={(e) => !connectionId && e.preventDefault()}
                  className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition duration-200 ease-in-out flex items-center justify-center ${!connectionId && 'opacity-50 cursor-not-allowed'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Connect to Session
                </Link>
              </div>
            </div>
          </div>

          {/* How it works section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Generate ID</h3>
                <p className="text-gray-600 dark:text-gray-300">Create a unique session ID to establish a secure connection</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Screen</h3>
                <p className="text-gray-600 dark:text-gray-300">Share your desktop, window or tab with end-to-end encryption</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                  <span className="text-lg font-bold">3</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Remote Control</h3>
                <p className="text-gray-600 dark:text-gray-300">Enable mouse and keyboard control for remote assistance</p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-16 text-center">
            <Link href="/debug" className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Connection Diagnostics
            </Link>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              This application uses WebRTC for direct peer-to-peer connections
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
