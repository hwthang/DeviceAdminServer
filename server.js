const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET","POST"]
  },
  transports: ['websocket', 'polling'] // cho phép websocket
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Log HTTP requests

// Routes
app.get('/', (req, res) => {
  res.send('Hello World! Server is running.');
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Lắng nghe client join room
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  // Nhận message từ room "location"
  socket.on('location', (data) => {
    console.log(`Location message from ${socket.id}:`, data);
    // Bạn có thể xử lý dữ liệu location ở đây
    // Ví dụ gửi thông báo đến room "command" nếu cần
  });

  // Nhận message từ room "command" (client gửi lên)
  socket.on('command', (data) => {
    console.log(`Command message from ${socket.id}:`, data);
    // Gửi lại message cho các client trong room "command"
    io.to('command').emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
