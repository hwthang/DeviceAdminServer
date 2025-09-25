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

  // Lắng nghe message từ client
  socket.on('message', (msg) => {
    console.log('Message received:', msg);
    // Gửi lại message cho tất cả client
    io.emit('message', msg);
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
