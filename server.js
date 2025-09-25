const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

// Middleware Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Cho phép tất cả domain gửi request HTTP
const cors = require('cors');
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// Socket.IO setup với CORS cho phép tất cả domain
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Routes
app.get('/', (req, res) => {
  res.send('Hello World! Server is running.');
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join room
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  // Nhận message từ room location
  socket.on('location', (data) => {
    console.log(`Location from ${socket.id}:`, data);
  });

  // Nhận message từ room command
  socket.on('command', (data) => {
    console.log(`Command from ${socket.id}:`, data);
    io.to('command').emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API gửi command từ server
app.post('/send-command', (req, res) => {
  const { message } = req.body;
  io.to('command').emit('message', message);
  console.log(`Server sent message to command room: ${message}`);
  res.send({ status: 'Message sent to command room' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
