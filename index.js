const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const ACTIONS = require("./Action");

const app = express();
const server = http.createServer(app, {
  keepAlive: true,
});
const io = new Server(server, {
  pingInterval: 10000,
  keepAlive: true,
});
const port = 5000;

app.use(cors());
app.use(express.json());

const userSocketMap = {};
function getAllConnectedmembers(roomid) {
  // Map
  return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map(
    (socketId) => {
      return {
        socketId,
        name: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomid, name }) => {
    userSocketMap[socket.id] = name;
    socket.join(roomid);
    const members = getAllConnectedmembers(roomid);
    members.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        members,
        name,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomid, code }) => {
    socket.in(roomid).emit(ACTIONS.CODE_CHANGE, {
      code,
    });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomid) => {
      socket.in(roomid).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        name: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

app.get("/", (req, res) => {
  res.send(req.body);
});

app.post("/result", (req, res) => {
  const result = req.body;
  res.send(result);
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
