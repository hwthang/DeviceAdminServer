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
  transports: ['websocket', 'polling']
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Hello World! Server is running.');
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Client join room
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  // Nhận location từ client
  socket.on('location', (data) => {
    console.log(`Location from ${socket.id}:`, data);
    // Có thể gửi thông báo tới command room nếu muốn
    // io.to('command').emit('message', { type: 'locationUpdate', data });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API để server gửi message tới room "command"
app.post('/send-command', (req, res) => {

  io.to('command').emit('lock');
  console.log(`Server sent message to command room: ${message}`);
  res.send({ status: 'Message sent to command room' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
