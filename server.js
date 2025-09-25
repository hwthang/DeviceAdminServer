const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Routes
app.get("/", (req, res) => {
  res.send("✅ Server is running with Socket.IO");
});

// ---------------- SOCKET.IO HANDLERS ----------------
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  // Nhận sự kiện cập nhật vị trí
  socket.on("location_update", (lat, lng) => {
    console.log(`📍 Location from ${socket.id}: ${lat}, ${lng}`);
  });

  // Ngắt kết nối
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ---------------- HTTP API ----------------

// Gửi command từ REST API
app.post("/send-command", (req, res) => {
  const { message } = req.body;
  io.to("command").emit("command", message);
  console.log(`📤 Server sent command to room "command": ${message}`);
  res.send({ status: "Message sent to command room" });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
