const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Allow connections from frontend
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000, // Increase timeout for better connection stability
});

app.use(cors());
app.use(express.json());

// Basic route for health check
app.get('/', (req, res) => {
  res.send('Remote Desktop Signaling Server is running');
});

// Track active rooms and connections
const rooms = new Map();

// Debug helper function
function logRoomState(roomId) {
  if (!rooms.has(roomId)) {
    console.log(`Room ${roomId}: does not exist`);
    return;
  }
  
  const room = rooms.get(roomId);
  console.log(`Room ${roomId}: host=${room.host || 'none'}, viewers=${Array.from(room.viewers).join(',') || 'none'}`);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  let currentRoom = null;
  let isHost = false;

  // Handle join-room event
  socket.on('join-room', ({ roomId, isHost: _isHost }) => {
    // Store client role
    isHost = _isHost;
    currentRoom = roomId;

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      console.log(`Creating new room: ${roomId}`);
      rooms.set(roomId, { host: null, viewers: new Set() });
    }

    const room = rooms.get(roomId);
    
    console.log(`Client ${socket.id} joining room ${roomId} as ${isHost ? 'host' : 'viewer'}`);

    if (isHost) {
      // Register as host
      room.host = socket.id;
      socket.join(roomId);
      console.log(`Host joined room ${roomId}`);

      // Notify viewers if any
      if (room.viewers.size > 0) {
        console.log(`Notifying ${room.viewers.size} viewer(s) about host joining`);
        io.to(roomId).emit('host-joined');
      }
    } else {
      // Register as viewer
      room.viewers.add(socket.id);
      socket.join(roomId);
      console.log(`Viewer joined room ${roomId}`);

      // Notify host if present
      if (room.host) {
        console.log(`Notifying host ${room.host} about viewer joining`);
        io.to(roomId).emit('viewer-joined');
      } else {
        // If no host in the room, inform the viewer
        console.log(`No host found in room ${roomId}, informing viewer`);
        socket.emit('no-host-in-room');
      }
    }
    
    logRoomState(roomId);
  });

  // Handle WebRTC signaling - offer
  socket.on('offer', ({ roomId, offer }) => {
    console.log(`Offer received from ${socket.id} for room ${roomId}`);
    // Broadcast to the room except the sender
    socket.to(roomId).emit('offer', { offer });
  });

  // Handle WebRTC signaling - answer
  socket.on('answer', ({ roomId, answer }) => {
    console.log(`Answer received from ${socket.id} for room ${roomId}`);
    // Broadcast to the room except the sender
    socket.to(roomId).emit('answer', { answer });
  });

  // Handle WebRTC signaling - ICE candidates
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    console.log(`ICE candidate received from ${socket.id} for room ${roomId}`);
    // Broadcast to the room except the sender
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  // Handle remote control inputs
  socket.on('remote-input', ({ roomId, ...data }) => {
    // Only forward if from a viewer to host
    const room = rooms.get(roomId);
    if (room && !isHost && room.host) {
      io.to(room.host).emit('remote-input', data);
    }
  });

  // Handle client ping for connection verification
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback();
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (isHost) {
          // Host disconnected
          room.host = null;
          io.to(currentRoom).emit('host-disconnected');
          console.log(`Host left room ${currentRoom}`);
        } else {
          // Viewer disconnected
          room.viewers.delete(socket.id);
          if (room.host) {
            io.to(room.host).emit('viewer-disconnected');
          }
          console.log(`Viewer left room ${currentRoom}`);
        }

        // Clean up empty rooms
        if (room.host === null && room.viewers.size === 0) {
          rooms.delete(currentRoom);
          console.log(`Room ${currentRoom} deleted (empty)`);
        } else {
          logRoomState(currentRoom);
        }
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});

// Log all rooms periodically
setInterval(() => {
  console.log(`Active rooms: ${rooms.size}`);
  for (const [roomId, room] of rooms.entries()) {
    logRoomState(roomId);
  }
}, 30000);
