// import { Server, Socket } from "socket.io";
// import { randomUUID } from "crypto";
// import { WSmessage } from "../types/message.js";


// export function initSignaling(io: Server) {

//     const clients = new Map<string, string>(); // Map of client IDs to socket connections

//     io.on('connection', (socket: Socket) => {
//         const userID = randomUUID();
//         clients.set(userID, socket.id);

//         socket.emit('joined', { type: "joined", id: userID });
//         console.log(`Client connected: ${userID}`);

//         socket.on("message", (message: WSmessage) => {

//             switch (message.type) {
//                 case "offer":
//                 case "answer":
//                 case "iceCandidate":
//                     if (message.to) {
//                         const targetSocketId = clients.get(message.to);
//                         if (targetSocketId) {
//                             io.to(targetSocketId).emit('message', { ...message, from: userID });
//                         }
//                     }
//                     break;
//                 default:
//                     console.warn("Unknown message type:", message.type);
//             }

//         });

//         socket.on("disconnect", () => {
//             if (userID) {
//                 clients.delete(userID);
//                 console.log(`Client disconnected: ${userID}`);

//             }
//         });

//         socket.on("error", (err) => {
//             console.log(`Socket error for client ${userID}:`, err);

//         });

//     });
// }


import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { WSmessage } from "../types/message.js";

// Generate a short 6-character room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface RoomInfo {
  id: string;
  users: Map<string, string>; // userId -> socketId
  createdAt: number;
}

export function initSignaling(io: Server) {
  const clients = new Map<string, string>(); // userId -> socketId
  const rooms = new Map<string, RoomInfo>();  // roomCode -> RoomInfo
  const userRooms = new Map<string, string>(); // userId -> roomCode

  io.on("connection", (socket: Socket) => {
    const userID = randomUUID();
    clients.set(userID, socket.id);

    socket.emit("joined", { type: "joined", id: userID });
    console.log(`Client connected: ${userID}`);

    // ---- Room Events ----

    socket.on("create-room", () => {
      // Leave any existing room first
      leaveCurrentRoom(userID);

      const roomCode = generateRoomCode();
      const room: RoomInfo = {
        id: roomCode,
        users: new Map([[userID, socket.id]]),
        createdAt: Date.now(),
      };
      rooms.set(roomCode, room);
      userRooms.set(userID, roomCode);
      socket.join(roomCode);

      socket.emit("room-created", { roomCode });
      console.log(`Room ${roomCode} created by ${userID}`);
    });

    socket.on("join-room", (data: { roomCode: string }) => {
      const roomCode = data.roomCode.toUpperCase().trim();
      const room = rooms.get(roomCode);

      if (!room) {
        socket.emit("room-error", { message: "Room not found. Check the code and try again." });
        return;
      }

      if (room.users.size >= 2) {
        socket.emit("room-error", { message: "Room is full. Only 2 participants allowed." });
        return;
      }

      if (room.users.has(userID)) {
        socket.emit("room-error", { message: "You are already in this room." });
        return;
      }

      // Leave any existing room first
      leaveCurrentRoom(userID);

      room.users.set(userID, socket.id);
      userRooms.set(userID, roomCode);
      socket.join(roomCode);

      socket.emit("room-joined", { roomCode });

      // Notify both users that room is ready (2 participants)
      const userIds = Array.from(room.users.keys());
      const initiatorId = userIds[0]; // The room creator initiates the call
      const answererId = userIds[1];

      // Tell the initiator (room creator) to start the call
      const initiatorSocketId = room.users.get(initiatorId);
      if (initiatorSocketId) {
        io.to(initiatorSocketId).emit("room-ready", {
          roomCode,
          peerId: answererId,
          isInitiator: true,
        });
      }

      // Tell the joiner they're connected
      const answererSocketId = room.users.get(answererId);
      if (answererSocketId) {
        io.to(answererSocketId).emit("room-ready", {
          roomCode,
          peerId: initiatorId,
          isInitiator: false,
        });
      }

      console.log(`Room ${roomCode} is now ready with 2 users`);
    });

    socket.on("leave-room", () => {
      leaveCurrentRoom(userID);
    });

    // ---- Signaling Messages (scoped to room) ----

    socket.on("message", (message: WSmessage) => {
      switch (message.type) {
        case "offer":
        case "answer":
        case "iceCandidate":
          if (message.to) {
            const targetSocketId = clients.get(message.to);
            if (targetSocketId) {
              io.to(targetSocketId).emit("message", { ...message, from: userID });
            }
          }
          break;
        default:
          console.warn("Unknown message type:", (message as any).type);
      }
    });

    // ---- Disconnect ----

    socket.on("disconnect", () => {
      leaveCurrentRoom(userID);
      clients.delete(userID);
      console.log(`Client disconnected: ${userID}`);
    });

    socket.on("error", (err) => {
      console.log(`Socket error for client ${userID}:`, err);
    });

    // ---- Helper ----

    function leaveCurrentRoom(uid: string) {
      const roomCode = userRooms.get(uid);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (room) {
        room.users.delete(uid);

        // Notify remaining user that peer left
        room.users.forEach((socketId) => {
          io.to(socketId).emit("peer-left", { roomCode });
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        }
      }

      userRooms.delete(uid);
      socket.leave(roomCode);
      console.log(`User ${uid} left room ${roomCode}`);
    }
  });

  // Clean up stale rooms every 30 minutes
  setInterval(() => {
    const now = Date.now();
    const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
    rooms.forEach((room, code) => {
      if (room.users.size === 0 && now - room.createdAt > STALE_MS) {
        rooms.delete(code);
        console.log(`Stale room ${code} cleaned up`);
      }
    });
  }, 30 * 60 * 1000);
}