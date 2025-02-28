"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import Link from "next/link";
import PointerLockStatus from "../components/PointerLockStatus";

export default function ViewerPage() {
  // Current state and refs
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("id");
  const [status, setStatus] = useState("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const [isControlling, setIsControlling] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  
  // References
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  // Store event handler references
  const eventHandlersRef = useRef({
    mouseMoveHandler: null,
    mouseDownHandler: null,
    mouseUpHandler: null,
    keyDownHandler: null,
    keyUpHandler: null
  });
  
  // Add debug logging with useCallback
  const addDebugLog = useCallback((message) => {
    console.log(`[VIEWER] ${message}`);
    setDebugLog(prev => [...prev.slice(-9), {
      time: new Date().toLocaleTimeString(),
      message
    }]);
  }, []);

  // Enable remote control
  const enableControl = useCallback(() => {
    if (!containerRef.current || !remoteVideoRef.current || !socketRef.current) {
      addDebugLog('Unable to enable control - missing references');
      return false;
    }
    
    addDebugLog('Enabling remote control');
    
    // Define the handlers
    const handleMouseMove = (e) => {
      if (!socketRef.current) return;
      
      const videoRect = remoteVideoRef.current.getBoundingClientRect();
      const x = (e.clientX - videoRect.left) / videoRect.width;
      const y = (e.clientY - videoRect.top) / videoRect.height;
      
      socketRef.current.emit("remote-input", {
        roomId: connectionId,
        type: "mousemove",
        x,
        y
      });
    };

    const handleMouseDown = (e) => {
      if (!socketRef.current) return;
      
      const videoRect = remoteVideoRef.current.getBoundingClientRect();
      const x = (e.clientX - videoRect.left) / videoRect.width;
      const y = (e.clientY - videoRect.top) / videoRect.height;
      
      socketRef.current.emit("remote-input", {
        roomId: connectionId,
        type: "mousedown",
        button: e.button,
        x,
        y
      });
    };

    const handleMouseUp = (e) => {
      if (!socketRef.current) return;
      
      const videoRect = remoteVideoRef.current.getBoundingClientRect();
      const x = (e.clientX - videoRect.left) / videoRect.width;
      const y = (e.clientY - videoRect.top) / videoRect.height;
      
      socketRef.current.emit("remote-input", {
        roomId: connectionId,
        type: "mouseup",
        button: e.button,
        x,
        y
      });
    };

    const handleKeyDown = (e) => {
      if (!socketRef.current) return;
      
      socketRef.current.emit("remote-input", {
        roomId: connectionId,
        type: "keydown",
        key: e.key,
        keyCode: e.keyCode || 0,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey
      });
      
      // Prevent default browser actions for certain keys
      if (["F5", "F11", "Tab"].includes(e.key) || (e.ctrlKey && ["r", "w", "t"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      if (!socketRef.current) return;
      
      socketRef.current.emit("remote-input", {
        roomId: connectionId,
        type: "keyup",
        key: e.key,
        keyCode: e.keyCode || 0,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey
      });
    };
    
    // Store handlers for later removal
    eventHandlersRef.current = {
      mouseMoveHandler: handleMouseMove,
      mouseDownHandler: handleMouseDown,
      mouseUpHandler: handleMouseUp,
      keyDownHandler: handleKeyDown,
      keyUpHandler: handleKeyUp
    };
    
    // Add event listeners
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    containerRef.current.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Request pointer lock for better mouse control
    try {
      containerRef.current.requestPointerLock = 
        containerRef.current.requestPointerLock || 
        containerRef.current.mozRequestPointerLock ||
        containerRef.current.webkitRequestPointerLock;
        
      if (containerRef.current.requestPointerLock) {
        containerRef.current.requestPointerLock();
        addDebugLog('Requested pointer lock');
      } else {
        addDebugLog('Pointer lock API not supported');
      }
    } catch (err) {
      addDebugLog(`Error requesting pointer lock: ${err.message}`);
    }
    
    return true;
  }, [connectionId, addDebugLog]);

  // Disable remote control
  const disableControl = useCallback(() => {
    if (!containerRef.current) {
      addDebugLog('Container reference missing when disabling control');
      return;
    }
    
    addDebugLog('Disabling remote control');
    
    // Get stored handlers
    const {
      mouseMoveHandler,
      mouseDownHandler,
      mouseUpHandler,
      keyDownHandler,
      keyUpHandler
    } = eventHandlersRef.current;
    
    // Remove event listeners if handlers exist
    if (mouseMoveHandler) {
      containerRef.current.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (mouseDownHandler) {
      containerRef.current.removeEventListener('mousedown', mouseDownHandler);
    }
    if (mouseUpHandler) {
      containerRef.current.removeEventListener('mouseup', mouseUpHandler);
    }
    if (keyDownHandler) {
      window.removeEventListener('keydown', keyDownHandler);
    }
    if (keyUpHandler) {
      window.removeEventListener('keyup', keyUpHandler);
    }
    
    // Exit pointer lock if active
    try {
      document.exitPointerLock = 
        document.exitPointerLock || 
        document.mozExitPointerLock ||
        document.webkitExitPointerLock;
        
      if (document.exitPointerLock && document.pointerLockElement === containerRef.current) {
        document.exitPointerLock();
        addDebugLog('Exited pointer lock');
      }
    } catch (err) {
      addDebugLog(`Error exiting pointer lock: ${err.message}`);
    }
  }, [addDebugLog]);

  // Toggle remote control
  const toggleControl = useCallback(() => {
    if (!isControlling) {
      const success = enableControl();
      if (success) {
        setIsControlling(true);
        addDebugLog('Remote control enabled');
      }
    } else {
      disableControl();
      setIsControlling(false);
      addDebugLog('Remote control disabled');
    }
  }, [isControlling, enableControl, disableControl, addDebugLog]);

  // The main WebRTC connection setup
  useEffect(() => {
    if (!connectionId) return;

    addDebugLog(`Initializing viewer for connection ID: ${connectionId}`);
   
    // Connect to signaling server
    try {
      const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
      addDebugLog(`Connecting to socket server at: ${socketURL}`);
      
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
    socketRef.current.on('connect', () => {
      addDebugLog('Socket connected! Socket ID: ' + socketRef.current.id);
      // After successful socket connection, join the room
      socketRef.current.emit("join-room", { roomId: connectionId, isHost: false });
      setStatus("connecting");
    });
    
    socketRef.current.on('connect_error', (err) => {
      addDebugLog(`Socket connection error: ${err.message}`);
      setStatus("error");
      setErrorMessage(`Socket connection error: ${err.message}`);
    });

    // Setup WebRTC
    const setupWebRTC = async () => {
      try {
        addDebugLog('Setting up WebRTC...');
        // Create RTCPeerConnection with STUN/TURN servers
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

        // Set up event handlers for incoming tracks
        peerConnectionRef.current.ontrack = (event) => {
          addDebugLog(`Track received: ${event.track.kind}`);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            addDebugLog('ICE candidate generated');
            socketRef.current.emit("ice-candidate", {
              roomId: connectionId,
              candidate: event.candidate
            });
          }
        };
        
        // Log ICE connection state changes
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          const state = peerConnectionRef.current.iceConnectionState;
          addDebugLog(`ICE connection state: ${state}`);
          
          if (state === 'connected' || state === 'completed') {
            setStatus("connected");
          } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            if (state === 'failed') {
              setStatus("connection-failed");
              setErrorMessage(`ICE connection failed: ${state}`);
              if (isControlling) {
                disableControl();
                setIsControlling(false);
              }
            }
          }
        };

        // Connection state handling
        peerConnectionRef.current.onconnectionstatechange = () => {
          const state = peerConnectionRef.current.connectionState;
          addDebugLog(`Connection state: ${state}`);
          
          if (state === 'connected') {
            setStatus("connected");
          } else if (state === 'failed' || state === 'closed') {
            if (state === 'failed') {
              setStatus("connection-failed");
              if (isControlling) {
                disableControl();
                setIsControlling(false);
              }
            }
          }
        };
      } catch (err) {
        addDebugLog(`Error setting up WebRTC: ${err.message}`);
        setStatus("error");
        setErrorMessage(`WebRTC setup error: ${err.message}`);
      }
    };

    // Call setupWebRTC
    setupWebRTC();

    // Handle offer from host
    socketRef.current.on("offer", async (data) => {
      addDebugLog('Received offer from host');
      try {
        if (!peerConnectionRef.current) {
          addDebugLog("PeerConnection not initialized when offer received");
          return;
        }
        
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        addDebugLog('Remote description set successfully');
        
        // Create answer
        addDebugLog('Creating answer...');
        const answer = await peerConnectionRef.current.createAnswer();
        addDebugLog('Answer created');
        
        await peerConnectionRef.current.setLocalDescription(answer);
        addDebugLog('Local description set');
        
        socketRef.current.emit("answer", {
          roomId: connectionId,
          answer: answer
        });
        addDebugLog('Answer sent to host');
        
        setStatus("awaiting-connection");
      } catch (err) {
        addDebugLog(`Error handling offer: ${err.message}`);
        setStatus("error");
        setErrorMessage(`Error handling offer: ${err.message}`);
      }
    });

    // Handle ICE candidate from host
    socketRef.current.on("ice-candidate", async (data) => {
      try {
        addDebugLog('Received ICE candidate from host');
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          addDebugLog('Added ICE candidate from host');
        }
      } catch (e) {
        addDebugLog(`Error adding ICE candidate: ${e.message}`);
      }
    });

    // Handle host disconnect
    socketRef.current.on("host-disconnected", () => {
      addDebugLog('Host disconnected');
      setStatus("host-disconnected");
      setIsControlling(false);
    });

    // Handle when no host is found in the room
    socketRef.current.on("no-host-in-room", () => {
      addDebugLog('No host found in this room');
      setStatus("no-host");
      setErrorMessage("No host found with this connection ID. Please check the ID and try again.");
    });

    // Cleanup on unmount
    return () => {
      // Make sure control is disabled when component unmounts
      if (isControlling) {
        disableControl();
      }
      
      // Close WebRTC and WebSocket connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      addDebugLog('Cleaning up viewer connection');
    };
  }, [connectionId, addDebugLog, isControlling, disableControl]);

  return (
    <>
      <PointerLockStatus />
      <div className="flex flex-col items-center min-h-screen p-4">
        <header className="w-full max-w-5xl flex justify-between items-center mb-6">
          <Link href="/" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              status === "connected" ? 'bg-green-500' : 
              status === "error" || status === "connection-failed" || status === "no-host" ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span>Status: {status}</span>
          </div>
        </header>

        <div className="flex flex-col items-center w-full max-w-5xl">
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 w-full">
            <h1 className="text-2xl font-bold mb-4">Viewing Remote Screen</h1>
            <div className="mb-4">
              <p className="font-semibold">Connection ID:</p>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 py-1 px-2 rounded">
                {connectionId || "N/A"}
              </span>
            </div>
            {errorMessage && (
              <div className="text-red-500 mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded">
                {errorMessage}
              </div>
            )}
            <button
              onClick={toggleControl}
              disabled={status !== "connected"}
              className={`${
                isControlling 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white py-2 px-4 rounded-md ${
                status !== "connected" ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isControlling ? 'Disable Remote Control' : 'Enable Remote Control'}
            </button>
          </div>

          <div 
            ref={containerRef}
            className="relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-crosshair"
          >
            <video 
              ref={remoteVideoRef}
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
            />
            {status !== "connected" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                {status === "initializing" && "Initializing..."}
                {status === "connecting" && "Connecting to signaling server..."}
                {status === "awaiting-connection" && "Establishing WebRTC connection..."}
                {status === "error" && "Connection error!"}
                {status === "no-host" && "No host found with this ID"}
                {status === "host-disconnected" && "Host has disconnected"}
                {status === "connection-failed" && "Connection failed"}
              </div>
            )}
          </div>
          
          {/* Debug Log */}
          {debugLog.length > 0 && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4">
              <h3 className="font-semibold mb-2">Debug Log:</h3>
              <div className="max-h-32 overflow-y-auto text-xs font-mono">
                {debugLog.map((item, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">[{item.time}]</span> {item.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
