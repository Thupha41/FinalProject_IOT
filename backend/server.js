const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

require('dotenv').config();
const PORT = process.env.PORT;
const HOST = process.env.HOST;
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
});

// Danh sách client React Native
const reactNativeClients = [];

function calculatePosition(data) {
  // Giả sử dữ liệu đầu vào là khoảng cách (nếu dùng RSSI, cần chuyển đổi)
  const d1 = data.distance1; // Khoảng cách đến điểm neo 1 (PC)
  const d2 = data.distance2; // Khoảng cách đến điểm neo 2 (ESP32)
  const D = 5; // Khoảng cách giữa hai điểm neo (mét), cần đo thực tế

  // Bilateration để tính vị trí (x, y)
  const x = (d1 * d1 - d2 * d2 + D * D) / (2 * D);
  const y_squared = d1 * d1 - x * x;
  if (y_squared < 0) return null; // Không có giải pháp thực
  const y = Math.sqrt(y_squared); // Chọn y dương (giả định đơn giản)

  return { x, y };
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Xác định loại client
  socket.on('identify', (data) => {
    if (data.type === 'react_native') {
      reactNativeClients.push(socket);
      console.log('React Native client added:', socket.id);
    }
  });

  // Nhận dữ liệu từ máy object detect
  socket.on('send_data', (data) => {
    console.log('Received data from object detect:', data);
    const position = calculatePosition(data);
    if (position) {
      // Phát vị trí đến tất cả client React Native
      reactNativeClients.forEach((client) => {
        if (client.connected) {
          client.emit('update_position', position);
        }
      });
    }
  });

  // Xử lý ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const index = reactNativeClients.indexOf(socket);
    if (index !== -1) {
      reactNativeClients.splice(index, 1);
    }
  });
});



const router = express.Router();
router.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/', router);

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});