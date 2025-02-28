"use client";

import { useState, useEffect } from 'react';

export default function PointerLockStatus() {
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsLocked(!!document.pointerLockElement);
    };
    
    // Listen for pointer lock changes
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mozpointerlockchange', handlePointerLockChange);
      document.removeEventListener('webkitpointerlockchange', handlePointerLockChange);
    };
  }, []);
  
  if (!isLocked) return null;
  
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <div className="relative">
          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute -inset-1 bg-green-500 rounded-full animate-ping opacity-25"></div>
        </div>
        <div>
          <p className="font-medium">Remote Control Active</p>
          <p className="text-sm opacity-80">Press ESC to exit mouse control</p>
        </div>
      </div>
    </div>
  );
}
