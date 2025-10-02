const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const cors = require("cors");

// ---------------- INIT SERVER ----------------
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// ---------------- DEVICE STORAGE ----------------
class Device {
  constructor(androidId, info) {
    this.deviceId = androidId;
    this.info = info;
    this.lastSeen = new Date();
    this.location = null;
    this.appLocked = false;
    this.alarmOn = false;
  }
}

let devices = []; // danh sách các Device

function registerDevice(payload) {
  const { androidId, ...info } = payload;
  let device = devices.find((d) => d.deviceId === androidId);

  if (device) {
    device.info = info;
    device.lastSeen = new Date();
  } else {
    device = new Device(androidId, info);
    devices.push(device);
  }
  return device;
}

function updateLocation(deviceId, lat, lng) {
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) {
    device.location = { lat, lng, updatedAt: new Date() };
    device.lastSeen = new Date();
  }
  return device;
}

// ---------------- SOCKET HANDLERS ----------------
io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("location_update", (data) => {
    const { deviceId, error } = data;
    if (error) {
      console.warn(`⚠️ Device ${deviceId} error: ${error}`);
      return;
    }

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      const device = updateLocation(deviceId, lat, lng);
      console.log(`📍 Location update from ${deviceId}:`, device.location);

      // Nếu có callback đang chờ, trả về location mới
      if (device && typeof device.locationCallback === "function") {
        device.locationCallback(device.location);
        delete device.locationCallback;
      }
    } else {
      console.warn(`⚠️ Invalid location payload from ${deviceId}:`, data);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ---------------- API ROUTES ----------------
app.get("/", (req, res) => {
  res.send("✅ Server is running with Socket.IO");
});

// Đăng ký thiết bị
app.post("/register-device", (req, res) => {
  const device = registerDevice(req.body);
  res.json({ success: true, device });
});

// Lấy danh sách thiết bị
app.get("/devices", (req, res) => {
  res.json(devices);
});

// Gửi command chung tới client
app.post("/send-command", (req, res) => {
  const { message } = req.body;
  io.emit("command", message);
  console.log(`📤 Server sent command: ${message}`);
  res.send({ status: "Message sent" });
});

// ---------------- DEVICE CONTROL ROUTES ----------------
app.post("/lock-screen", (req, res) => {
  const { deviceId } = req.body;
  io.emit("command", { type: "lockScreen", deviceId });
  console.log(`🔒 Lock screen command sent to ${deviceId}`);
  res.json({ success: true });
});

app.post("/lock-app", (req, res) => {
  const { deviceId } = req.body;
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) device.appLocked = true;
  io.emit("command", { type: "lockApp", deviceId });
  console.log(`📱 App locked on device ${deviceId}`);
  res.json({ success: true });
});

app.post("/unlock-app", (req, res) => {
  const { deviceId } = req.body;
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) device.appLocked = false;
  io.emit("command", { type: "unlockApp", deviceId });
  console.log(`📱 App unlocked on device ${deviceId}`);
  res.json({ success: true });
});

app.post("/start-warning", (req, res) => {
  const { deviceId } = req.body;
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) device.alarmOn = true;
  io.emit("command", { type: "startWarning", deviceId });
  console.log(`🚨 Warning started on device ${deviceId}`);
  res.json({ success: true });
});

app.post("/stop-warning", (req, res) => {
  const { deviceId } = req.body;
  let device = devices.find((d) => d.deviceId === deviceId);
  if (device) device.alarmOn = false;
  io.emit("command", { type: "stopWarning", deviceId });
  console.log(`🛑 Warning stopped on device ${deviceId}`);
  res.json({ success: true });
});

// ---------------- GET LOCATION API ----------------
app.get("/get-location/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  const device = devices.find((d) => d.deviceId === deviceId);

  if (!device) {
    return res.status(404).json({ success: false, message: "Device not found" });
  }

  const waitForLocation = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for device location"));
    }, 5000);

    device.locationCallback = (location) => {
      clearTimeout(timeout);
      resolve(location);
    };

    io.emit("command", { type: "getLocation", deviceId });
  });

  try {
    const location = await waitForLocation;
    res.json({ success: true, deviceId, location });
  } catch (err) {
    res.status(504).json({ success: false, message: err.message });
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
