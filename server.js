const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// ---------------- SOCKET.IO ----------------
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// ---------------- DEVICE STORAGE ----------------
// Bộ nhớ tạm để lưu danh sách thiết bị
let devices = []; // { deviceId, info, lastSeen, location }

// Hàm đăng ký hoặc cập nhật thiết bị
function registerDevice(payload) {
  const { androidId, ...info } = payload;
  let device = devices.find((d) => d.deviceId === androidId);

  if (device) {
    device.info = info;
    device.lastSeen = new Date();
  } else {
    device = {
      deviceId: androidId,
      info,
      lastSeen: new Date(),
      location: null,
    };
    devices.push(device);
  }
  return device;
}

// Hàm cập nhật vị trí
function updateLocation(deviceId, lat, lng) {
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) {
    device.location = { lat, lng, updatedAt: new Date() };
    device.lastSeen = new Date();
  }
  return device;
}

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.send("✅ Server is running with Socket.IO");
});

// API đăng ký thiết bị
app.post("/register-device", (req, res) => {
  const device = registerDevice(req.body);
  res.json({ success: true, device });
});

// API lấy danh sách thiết bị
app.get("/devices", (req, res) => {
  res.json(devices);
});

// API gửi command tới client
app.post("/send-command", (req, res) => {
  const { message } = req.body;
  io.emit("command", message);
  console.log(`📤 Server sent command: ${message}`);
  res.send({ status: "Message sent" });
});

// ---------------- SOCKET HANDLERS ----------------
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

 socket.on("location_update", (data) => {
  const { deviceId, error } = data;

  if (error) {
    console.warn(`⚠️ Device ${deviceId} error: ${error}`);
    return;
  }

  // Ép kiểu lat/lng sang number
  const lat = Number(data.lat);
  const lng = Number(data.lng);

  if (!isNaN(lat) && !isNaN(lng)) {
    const device = updateLocation(deviceId, lat, lng);
    console.log(`📍 Location update from ${deviceId}:`, device.location);
  } else {
    console.warn(`⚠️ Invalid location payload from ${deviceId}:`, data);
  }
});


  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
