# Indoor Positioning System (IPS) Project

## Overview | Tổng quan

This project implements an Indoor Positioning System using ESP32, MQTT, and React Native. The system calculates real-time positions using trilateration from two fixed anchor points.

Dự án này triển khai Hệ thống Định vị Trong nhà sử dụng ESP32, MQTT và React Native. Hệ thống tính toán vị trí theo thời gian thực bằng phương pháp tam giác từ hai điểm neo cố định.

## Features | Tính năng

- Real-time position tracking | Theo dõi vị trí thời gian thực
- Smooth animations for position updates | Hoạt ảnh mượt mà khi cập nhật vị trí
- Grid system with coordinate axes | Hệ thống lưới với các trục tọa độ
- Distance smoothing algorithm | Thuật toán làm mượt khoảng cách
- Obstacle detection | Phát hiện vật cản

## System Architecture | Kiến trúc hệ thống

1. **ESP32**: Collects distance measurements
2. **MQTT Broker**: Handles message routing
3. **Node.js Backend**: Processes data and calculates positions
4. **React Native Frontend**: Displays real-time visualization

## Prerequisites | Yêu cầu

- Node.js v20.14.0: https://nodejs.org/download/release/v20.14.0/
- MQTT Broker (e.g., Mosquitto)
- ESP32 Development Board

## Installation | Cài đặt

### Backend

1. Clone the repository | Clone dự án
```bash
git clone [repository-url]
cd backend
```

2. Install dependencies | Cài đặt thư viện
```bash
npm install
```

3. Configure environment | Cấu hình môi trường
- Create .env file with:
```
PORT=3000
HOST=your-host-ip
```

4. Start the server | Khởi động server
```bash
npm run dev
```

### Frontend

1. Navigate to frontend directory | Di chuyển vào thư mục frontend
```bash
cd frontend
```

2. Install dependencies | Cài đặt thư viện
```bash
npm install
```

3. Configure environment | Cấu hình môi trường
- Create .env file with:
```
EXPO_PUBLIC_SERVER_URL=http://your-backend-ip:3000
```

4. Start the app | Khởi động ứng dụng
```bash
npm run dev
```

## Technical Details | Chi tiết kỹ thuật

- Position calculation using trilateration
- Distance smoothing using moving average
- WebSocket for real-time updates
- MQTT for IoT communication
- Animated position updates in React Native

## Contributing | Đóng góp

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License | Giấy phép

This project is licensed under the MIT License - see the LICENSE file for details.
