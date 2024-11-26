const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('activateCell', (data) => {
    console.log('Activating cell:', data.cellNumber);
    io.emit('activateCell', { cellNumber: data.cellNumber });
  });

  socket.on('cellUpdate', (cellNumber) => {
    console.log('Cell updated:', cellNumber);
    io.emit('cellUpdate', cellNumber);
  });

  socket.on('cellSkipped', (cellNumber) => {
    console.log('Cell skipped:', cellNumber);
    io.emit('cellSkipped', cellNumber);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});