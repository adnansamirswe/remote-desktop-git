"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import Link from "next/link";

export default function HostContent() {
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("id");
  const [status, setStatus] = useState("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerConnected, setViewerConnected] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const streamRef = useRef(null);
  const setupWebRTCRef = useRef(null);
  
  // Use useCallback to prevent re-creation of this function on each render
  const addDebugLog = useCallback((message) => {
    console.log(`[HOST] ${message}`);
    setDebugInfo(prev => [...prev.slice(-9), {
      time: new Date().toLocaleTimeString(),
      message
    }]);
  }, []);

  // Use useCallback for handleRestart to prevent dependency issues
  const handleRestart = useCallback(async () => {
    addDebugLog('Restarting connection');
    
    // Clean up existing resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Reset state
    setStatus("initializing");
    setErrorMessage("");
    setViewerConnected(false);
    
    // Re-setup WebRTC
    try {
      if (setupWebRTCRef.current) {
        await setupWebRTCRef.current();
        // Re-join room
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("join-room", { roomId: connectionId, isHost: true });
          setStatus("waiting");
        }
      } else {
        throw new Error("WebRTC setup function not available");
      }
    } catch (err) {
      addDebugLog(`Restart failed: ${err.message}`);
      setStatus("error");
      setErrorMessage(`Failed to restart: ${err.message}`);
    }
  }, [connectionId, addDebugLog]);

  useEffect(() => {
    if (!connectionId) return;
    
    // Connect to signaling server
    try {
      const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || "https://remote-desktop-backend.onrender.com";
      addDebugLog(`Connecting to socket at: ${socketURL}`);
      
      socketRef.current = io(socketURL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000
      });
    } catch (err) {
      addDebugLog(`Error creating socket: ${err.message}`);
      setStatus("error");
      setErrorMessage(`Socket creation error: ${err.message}`);
      return;
    }
    
    // Socket connection listeners
    socketRef.current.on('connect', async () => {
      addDebugLog('Socket connected! ID: ' + socketRef.current.id);
      
      // Join room as host
      socketRef.current.emit("join-room", { roomId: connectionId, isHost: true });
      setStatus("waiting");
      
      // Start WebRTC setup
      try {
        await setupWebRTCRef.current();
      } catch (err) {
        addDebugLog(`WebRTC setup error: ${err.message}`);
        setStatus("error");
        setErrorMessage(`WebRTC setup error: ${err.message}`);
      }
    });
    
    // Socket connection listeners and WebRTC setup from the original file
    // ...rest of your existing useEffect code...

    // Handle remote input
    const handleRemoteInput = (data) => {
      if (!data) return;
      
      // Log remote inputs for debugging
      if (data.type !== 'mousemove') {
        addDebugLog(`Remote input: ${data.type}`);
      }
      
      switch (data.type) {
        case "mousemove":
          simulateMouseMove(data.x, data.y);
          break;
        case "mousedown":
          simulateMouseEvent("mousedown", data.x, data.y, data.button);
          break;
        case "mouseup":
          simulateMouseEvent("mouseup", data.x, data.y, data.button);
          break;
        case "keydown":
          simulateKeyEvent("keydown", data.key);
          break;
        case "keyup":
          simulateKeyEvent("keyup", data.key);
          break;
      }
    };

    // Helper functions for input simulation
    const simulateMouseMove = (x, y) => {
      // Implementation remains the same
    };

    const simulateMouseEvent = (type, x, y, button) => {
      console.log(`${type} at ${x},${y} button ${button}`);
    };

    const simulateKeyEvent = (type, key) => {
      console.log(`${type}: ${key}`);
    };

    // Setup WebRTC function
    const setupWebRTC = async () => {
      // Implementation remains the same - your original setupWebRTC function
      try {
        addDebugLog('Requesting screen sharing...');
        
        // Use try-catch specifically for getDisplayMedia to handle permission denial
        try {
          // Request screen sharing with specific constraints for better compatibility
          streamRef.current = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always",
              frameRate: { ideal: 30 },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          // Stop the stream if user denies screen sharing by closing the browser dialog
          if (!streamRef.current) {
            throw new Error("Screen sharing stream is null");
          }
          
          addDebugLog(`Screen sharing obtained with ${streamRef.current.getTracks().length} tracks`);
          
          // Handle stop sharing (user clicks "Stop sharing" in browser UI)
          streamRef.current.getVideoTracks()[0].onended = () => {
            addDebugLog("User stopped screen sharing");
            setStatus("stopped-sharing");
            setErrorMessage("Screen sharing was stopped. Return to dashboard to start a new session.");
          };
          
        } catch (err) {
          if (err.name === 'NotAllowedError') {
            throw new Error("Screen sharing permission denied");
          } else if (err.name === 'NotFoundError') {
            throw new Error("No screen sharing device found");
          } else {
            throw err;
          }
        }
        
        // Show the stream in local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = streamRef.current;
          addDebugLog('Stream added to video element');
        }

        // Create RTCPeerConnection
        const configuration = { 
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" }
          ],
          iceCandidatePoolSize: 10
        };
        
        peerConnectionRef.current = new RTCPeerConnection(configuration);
        addDebugLog('RTCPeerConnection created');
        
        // Add all tracks from the stream to the peer connection
        streamRef.current.getTracks().forEach(track => {
          addDebugLog(`Adding ${track.kind} track to peer connection`);
          peerConnectionRef.current.addTrack(track, streamRef.current);
        });

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            addDebugLog(`Generated ICE candidate: ${event.candidate.candidate.substring(0, 20)}...`);
            socketRef.current.emit("ice-candidate", {
              roomId: connectionId,
              candidate: event.candidate
            });
          } else {
            addDebugLog('ICE candidate gathering complete');
          }
        };
        
        // ... rest of your setupWebRTC implementation

      } catch (err) {
        throw err; // Let the outer try-catch handle this
      }
    };
    
    // Store setupWebRTC in the ref for access by handleRestart
    setupWebRTCRef.current = setupWebRTC;
    
    // Set up event handlers last, after defining all the functions
    
    // Handle input events from viewer - add after setupWebRTC is defined
    socketRef.current.on("remote-input", handleRemoteInput);

    // Handle viewer disconnect
    socketRef.current.on("viewer-disconnected", () => {
      addDebugLog('Viewer disconnected');
      setViewerConnected(false);
      setStatus("waiting");
    });
    
    // Handle server disconnect
    socketRef.current.on("disconnect", () => {
      addDebugLog('Disconnected from server');
      setStatus("server-disconnected");
      setErrorMessage("Lost connection to the signaling server");
    });

    // Cleanup
    return () => {
      addDebugLog('Cleaning up host resources');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          addDebugLog(`Stopped ${track.kind} track`);
        });
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        addDebugLog('Closed peer connection');
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        addDebugLog('Disconnected from signaling server');
      }
    };
  }, [connectionId, addDebugLog]);

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      {/* Your original JSX return */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-6">
        <Link href="/" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${viewerConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span>{viewerConnected ? 'Viewer Connected' : 'Waiting for viewer'}</span>
        </div>
      </header>

      <div className="flex flex-col items-center w-full max-w-5xl">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 w-full">
          <h1 className="text-2xl font-bold mb-4">Sharing Your Screen</h1>
          <div className="mb-4">
            <p className="font-semibold">Connection ID:</p>
            <span className="font-mono bg-gray-200 dark:bg-gray-700 py-1 px-2 rounded">
              {connectionId || "N/A"}
            </span>
          </div>
          <div className="mb-4 flex items-center gap-2">
            <p className="font-semibold">Status:</p>
            <span className={`px-2 py-1 rounded ${
              status === "connected" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" :
              (status === "error" || status === "connection-failed" || status === "stopped-sharing") ? 
              "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" :
              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
            }`}>
              {status}
            </span>
          </div>
          
          {errorMessage && (
            <div className="text-red-500 mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded">
              {errorMessage}
            </div>
          )}
          
          <div className="flex gap-2">
            <Link href="/" className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-sm">
              New Session
            </Link>
            <Link href="/debug" className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm">
              Run Diagnostics
            </Link>
          </div>
        </div>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <video 
            ref={localVideoRef}
            autoPlay 
            playsInline 
            muted
            className="w-full h-full object-contain"
          />
          {(status === "error" || status === "connection-failed" || status === "stopped-sharing") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
              <div className="text-center p-4">
                <p className="mb-4">Connection error!</p>
                <button
                  onClick={handleRestart}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Debug info section */}
        {debugInfo.length > 0 && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Log:</h3>
            <div className="max-h-32 overflow-y-auto text-xs font-mono">
              {debugInfo.map((item, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">[{item.time}]</span> {item.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
