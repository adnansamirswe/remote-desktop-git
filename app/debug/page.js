"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function DebugPage() {
  const [rtcSupport, setRtcSupport] = useState(null);
  const [displayMediaSupport, setDisplayMediaSupport] = useState(null);
  const [socketStatus, setSocketStatus] = useState("checking");
  const [stunStatus, setStunStatus] = useState("checking");
  const [iceGatheringStatus, setIceGatheringStatus] = useState("not started");
  const [iceLog, setIceLog] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const testPeerRef = useRef(null);

  // Check for WebRTC support
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRtcSupport(!!window.RTCPeerConnection);
      setDisplayMediaSupport(
        !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
      );
    }
  }, []);

  // Test Socket.io connection
  useEffect(() => {
    const testSocketConnection = async () => {
      try {
        const { io } = await import("socket.io-client");
        const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
        
        setSocketStatus("connecting");
        
        const socket = io(socketURL, {
          timeout: 10000,
          reconnectionAttempts: 2,
        });

        socket.on("connect", () => {
          setSocketStatus("connected");
          socket.emit("ping", () => {
            setSocketStatus("verified");
            // Close socket after test
            setTimeout(() => socket.disconnect(), 1000);
          });
        });

        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          setSocketStatus("error");
          setErrorMessage(`Socket error: ${err.message}`);
        });

        socket.on("connect_timeout", () => {
          setSocketStatus("timeout");
        });

        return () => {
          socket.disconnect();
        };
      } catch (err) {
        console.error("Error testing socket:", err);
        setSocketStatus("error");
        setErrorMessage(`Socket module error: ${err.message}`);
      }
    };

    testSocketConnection();
  }, []);

  // Test STUN server and ICE gathering
  const testICEGathering = async () => {
    if (!rtcSupport) return;
    
    try {
      setIceGatheringStatus("starting");
      setIceLog([]);
      
      if (testPeerRef.current) {
        testPeerRef.current.close();
      }
      
      const stunServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ];
      
      testPeerRef.current = new RTCPeerConnection({
        iceServers: stunServers
      });
      
      testPeerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          setIceLog(prev => [...prev, {
            type: 'local candidate',
            value: event.candidate.candidate,
            timestamp: new Date().toISOString()
          }]);
        } else {
          setIceLog(prev => [...prev, {
            type: 'end of candidates',
            value: null,
            timestamp: new Date().toISOString()
          }]);
          setIceGatheringStatus("complete");
        }
      };
      
      testPeerRef.current.onicegatheringstatechange = () => {
        setIceGatheringStatus(testPeerRef.current.iceGatheringState);
      };
      
      testPeerRef.current.onicecandidateerror = (event) => {
        setIceLog(prev => [...prev, {
          type: 'error',
          value: `Error: ${event.errorText || 'Unknown error'} (${event.errorCode || 'no code'})`,
          timestamp: new Date().toISOString()
        }]);
      };
      
      // Create data channel to trigger ICE gathering
      testPeerRef.current.createDataChannel("testChannel");
      
      const offer = await testPeerRef.current.createOffer();
      await testPeerRef.current.setLocalDescription(offer);
      
      setStunStatus("testing");
      
      // Set a timeout to check if we've received public candidates
      setTimeout(() => {
        if (iceGatheringStatus !== "complete") {
          const hasPublicCandidate = iceLog.some(log => 
            log.type === 'local candidate' && !log.value.includes('host') && log.value.includes('srflx')
          );
          
          if (hasPublicCandidate) {
            setStunStatus("success");
          } else {
            setStunStatus("no-public-ip");
          }
        }
      }, 5000);
      
    } catch (err) {
      console.error("ICE gathering error:", err);
      setIceGatheringStatus("error");
      setErrorMessage(`ICE gathering error: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
      case "connected":
      case "verified":
      case "complete":
        return "text-green-500 bg-green-100 dark:bg-green-900/20";
      case "checking":
      case "testing":
      case "connecting":
      case "gathering":
      case "starting":
        return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20";
      case "error":
      case "timeout":
      case "no-public-ip":
        return "text-red-500 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-500 bg-gray-100 dark:bg-gray-800";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 max-w-4xl mx-auto">
      <header className="w-full flex justify-between items-center mb-6">
        <Link href="/" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold">WebRTC Diagnostics</h1>
      </header>

      {errorMessage && (
        <div className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-md mb-6">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="w-full space-y-6">
        {/* Browser Compatibility */}
        <section className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Browser Compatibility</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded">
              <span>WebRTC Support</span>
              <span className={`px-2 py-1 rounded ${rtcSupport ? 'text-green-500 bg-green-100 dark:bg-green-900/20' : 'text-red-500 bg-red-100 dark:bg-red-900/20'}`}>
                {rtcSupport ? "Supported" : "Not Supported"}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded">
              <span>Screen Sharing API</span>
              <span className={`px-2 py-1 rounded ${displayMediaSupport ? 'text-green-500 bg-green-100 dark:bg-green-900/20' : 'text-red-500 bg-red-100 dark:bg-red-900/20'}`}>
                {displayMediaSupport ? "Supported" : "Not Supported"}
              </span>
            </div>
          </div>
        </section>

        {/* Network Connectivity */}
        <section className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Network Connectivity</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded">
              <span>Signaling Server</span>
              <span className={`px-2 py-1 rounded ${getStatusColor(socketStatus)}`}>
                {socketStatus === "verified" ? "Connected & Operational" : 
                 socketStatus === "connected" ? "Connected" :
                 socketStatus === "connecting" ? "Connecting..." :
                 socketStatus === "error" ? "Connection Failed" :
                 socketStatus === "timeout" ? "Connection Timeout" : "Checking..."}
              </span>
            </div>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={testICEGathering}
              disabled={!rtcSupport || iceGatheringStatus === "starting" || iceGatheringStatus === "gathering"}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md"
            >
              Test STUN Server & ICE
            </button>
            
            <div className="mt-2 flex justify-between items-center p-2 rounded">
              <span>ICE Gathering Status</span>
              <span className={`px-2 py-1 rounded ${getStatusColor(iceGatheringStatus)}`}>
                {iceGatheringStatus === "not started" ? "Not Started" :
                 iceGatheringStatus === "starting" ? "Starting..." :
                 iceGatheringStatus === "gathering" ? "Gathering..." :
                 iceGatheringStatus === "complete" ? "Complete" : iceGatheringStatus}
              </span>
            </div>
            
            <div className="mt-2 flex justify-between items-center p-2 rounded">
              <span>STUN Server Status</span>
              <span className={`px-2 py-1 rounded ${getStatusColor(stunStatus)}`}>
                {stunStatus === "checking" ? "Not Tested" :
                 stunStatus === "testing" ? "Testing..." :
                 stunStatus === "success" ? "Working" :
                 stunStatus === "no-public-ip" ? "Failed - No Public IP" : stunStatus}
              </span>
            </div>
          </div>
          
          {iceLog.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">ICE Candidate Log</h3>
              <div className="mt-2 max-h-40 overflow-y-auto bg-gray-200 dark:bg-gray-900 p-2 rounded text-sm font-mono">
                {iceLog.map((log, idx) => (
                  <div key={idx} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                    <span className={log.type === 'error' ? 'text-red-500' : 'text-green-600'}> {log.type}: </span>
                    <span>{log.value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        
        {/* Troubleshooting Tips */}
        <section className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Tips</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Make sure the signaling server is running (<code>npm run server</code>)</li>
            <li>Check if you&apos;re behind a strict firewall that blocks WebRTC</li>
            <li>Try using a different browser if you&apos;re having issues</li>
            <li>Ensure you&lsquo;re allowing screen sharing permissions when prompted</li>
            <li>Check browser console for specific error messages</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
