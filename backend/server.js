const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
require('dotenv').config()

const app = express();
const PORT=process.env.PORT
const HOST=process.env.HOST
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const mqttClient = mqtt.connect(`mqtt://${HOST}:1883`);
const reactNativeClients = [];
  // Define anchor points
const anchors = {
  anchor1: { x: 3, y: 0 },  // Điểm neo 1 tại gốc tọa độ
  anchor2: { x: 5, y: 0 }   // Điểm neo 2 cách D mét theo trục x
};
let lastDistances = { d1: [], d2: [] };
const SMOOTHING_WINDOW = 5;
const MAX_DISTANCE = 14.14; // Khoảng cách tối đa trong phòng 10m x 10m

function smoothDistance(newD1, newD2) {
  lastDistances.d1.push(newD1);
  lastDistances.d2.push(newD2);
  if (lastDistances.d1.length > SMOOTHING_WINDOW) {
    lastDistances.d1.shift();
    lastDistances.d2.shift();
  }
  const avgD1 = lastDistances.d1.reduce((sum, val) => sum + val, 0) / lastDistances.d1.length;
  const avgD2 = lastDistances.d2.reduce((sum, val) => sum + val, 0) / lastDistances.d2.length;
  return { d1: avgD1, d2: avgD2 };
}

function calculatePosition(data) {
  const { d1, d2 } = smoothDistance(parseFloat(data.distance1), parseFloat(data.distance2));
  const D = anchors.anchor2.x - anchors.anchor1.x;

  // Kiểm tra khoảng cách tối đa
  if (d1 > MAX_DISTANCE || d2 > MAX_DISTANCE) {
    console.log('Distance exceeds room size:', { d1, d2 });
    const totalDistance = d1 + d2;
    const ratio = d1 / totalDistance;
    const estimatedX = anchors.anchor1.x + ratio * D;
    return {
      x: Number(estimatedX.toFixed(3)),
      y: 1,
      obstacle_distance: data.obstacle_distance,
      anchors: anchors,
    };
  }

  // Kiểm tra định lý tam giác
  if (d1 + d2 <= D || d1 + D <= d2 || d2 + D <= d1) {
    console.log('Invalid distances: Cannot form a triangle', { d1, d2, D });
    const totalDistance = d1 + d2;
    const ratio = d1 / totalDistance;
    const estimatedX = anchors.anchor1.x + ratio * D;
    return {
      x: Number(estimatedX.toFixed(3)),
      y: 1,
      obstacle_distance: data.obstacle_distance,
      anchors: anchors,
    };
  }

  if (d1 === 0 || d2 === 0) {
    console.log('Invalid distance measurement:', { d1, d2 });
    return {
      x: anchors.anchor1.x,
      y: anchors.anchor1.y,
      obstacle_distance: data.obstacle_distance,
      anchors: anchors,
    };
  }

  const relative_x = (d1 * d1 - d2 * d2 - anchors.anchor1.x * anchors.anchor1.x + anchors.anchor2.x * anchors.anchor2.x) / (2 * D);
  let absolute_x = anchors.anchor1.x + relative_x;
  absolute_x = absolute_x < 0 ? 0 : absolute_x > (anchors.anchor1.x + D) ? (anchors.anchor1.x + D) : absolute_x;

  const y_squared = d1 * d1 - Math.pow(absolute_x - anchors.anchor1.x, 2);

  if (Math.abs(y_squared) < 0.000001) {
    return {
      x: Number(absolute_x.toFixed(3)),
      y: 1,
      obstacle_distance: data.obstacle_distance,
      anchors: anchors,
    };
  }

  if (y_squared < 0) {
    console.log('Warning: Negative y_squared:', { d1, d2, absolute_x, y_squared });
    const totalDistance = d1 + d2;
    const ratio = d1 / totalDistance;
    const estimatedX = anchors.anchor1.x + ratio * D;
    return {
      x: Number(estimatedX.toFixed(3)),
      y: 1,
      obstacle_distance: data.obstacle_distance,
      anchors: anchors,
    };
  }

  const absolute_y = Math.sqrt(y_squared);
  return {
    x: Number(absolute_x.toFixed(3)),
    y: Number(absolute_y.toFixed(3)),
    obstacle_distance: data.obstacle_distance,
    anchors: anchors,
  };
}

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('esp32/data', (err) => {
    if (!err) console.log('Subscribed to esp32/data');
  });
});

mqttClient.on('message', (topic, message) => {
  if (topic === 'esp32/data') {
    const data = JSON.parse(message.toString());
    console.log('Received MQTT data:', data);
    const position = calculatePosition(data);
    // console.log('Calculated position:', position);
    
    if (position) {
      console.log('Number of connected React Native clients:', reactNativeClients.length);
      reactNativeClients.forEach((client, index) => {
        if (client.connected) {
          console.log(`Emitting to client ${index}:`, position);
          client.emit('update_position', position);
        } else {
          console.log(`Client ${index} is not connected`);
        }
      });
    } else {
      console.log('Position calculation returned null');
    }
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('identify', (data) => {
    if (data.type === 'react_native') {
      reactNativeClients.push(socket);
      console.log('React Native client added:', socket.id);
    }
  });

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