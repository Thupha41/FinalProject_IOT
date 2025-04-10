import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  SafeAreaView,
  Animated,
} from "react-native";
import io from "socket.io-client";
import { LinearGradient } from "expo-linear-gradient";

const App = () => {
  // State cho vị trí ESP32
  const [position, setPosition] = useState({
    latitude: 0,
    longitude: 0,
    obstacle: 0,
  });

  // State cho các điểm neo
  const [anchorPoints, setAnchorPoints] = useState({
    anchor1: { latitude: 0, longitude: 3 },
    anchor2: { latitude: 0, longitude: 8 },
  });

  // Animated value để làm mượt chuyển động của ESP32
  const animatedPosition = useState(new Animated.ValueXY({ x: 0, y: 0 }))[0];

  // URL của server Node.js
  const SERVER_URL =
    process.env.EXPO_PUBLIC_SERVER_URL;

  useEffect(() => {
    console.log("Connecting to server:", SERVER_URL);
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      socket.emit("identify", { type: "react_native" });
    });

    socket.on("update_position", (data) => {
      console.log("Received position:", data);
      // Cập nhật vị trí ESP32
      setPosition({
        latitude: data.y || 0,
        longitude: data.x || 0,
        obstacle: data.obstacle_distance || 0,
      });

      // Cập nhật vị trí các điểm neo nếu có
      if (data.anchors) {
        setAnchorPoints({
          anchor1: {
            latitude: data.anchors.anchor1.y || 0,
            longitude: data.anchors.anchor1.x || 3,
          },
          anchor2: {
            latitude: data.anchors.anchor2.y || 0,
            longitude: data.anchors.anchor2.x || 8,
          },
        });
      }

      // Tính toán tọa độ màn hình và tạo animation
      const screenX = toScreenX(data.x || 0);
      const screenY = toScreenY(data.y || 0);
      Animated.timing(animatedPosition, {
        toValue: { x: screenX, y: screenY },
        duration: 300, // Thời gian animation (ms)
        useNativeDriver: false,
      }).start();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    socket.on("connect_error", (error) => {
      console.log("Connection error:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Kích thước phòng (đơn vị mét)
  const roomWidth = 10;
  const roomHeight = 10;

  // Chuyển đổi tọa độ thực tế sang tọa độ màn hình
  const screenWidth = Dimensions.get("window").width - 40;
  const screenHeight = screenWidth * (roomHeight / roomWidth);

  const toScreenX = (x: any) => (x / roomWidth) * screenWidth;
  const toScreenY = (y: any) => screenHeight - (y / roomHeight) * screenHeight;

  // Tọa độ màn hình của các điểm
  const anchor1Pos = {
    x: toScreenX(anchorPoints.anchor1.longitude),
    y: toScreenY(anchorPoints.anchor1.latitude),
  };
  const anchor2Pos = {
    x: toScreenX(anchorPoints.anchor2.longitude),
    y: toScreenY(anchorPoints.anchor2.latitude),
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Hệ thống định vị trong cửa hàng</Text>
      <LinearGradient
        colors={["#ffffff", "#f8f9fa"]}
        style={styles.gradientContainer}
      >
        <View
          style={[styles.room, { width: screenWidth, height: screenHeight }]}
        >
          {/* Lưới ngang */}
          {[...Array(roomHeight + 1)].map((_, i) => (
            <View
              key={`grid-h-${i}`}
              style={{
                position: "absolute",
                left: 0,
                top: toScreenY(i),
                width: screenWidth,
                height: 1,
                backgroundColor: "#ddd",
              }}
            />
          ))}
          {/* Lưới dọc */}
          {[...Array(roomWidth + 1)].map((_, i) => (
            <View
              key={`grid-v-${i}`}
              style={{
                position: "absolute",
                left: toScreenX(i),
                top: 0,
                width: 1,
                height: screenHeight,
                backgroundColor: "#ddd",
              }}
            />
          ))}

          {/* Trục x */}
          <View
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: screenWidth,
              height: 2,
              backgroundColor: "#333",
            }}
          />
          {/* Trục y */}
          <View
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: 2,
              height: screenHeight,
              backgroundColor: "#333",
            }}
          />

          {/* Vạch chia trên trục x */}
          {[...Array(roomWidth + 1)].map((_, i) => (
            <View
              key={`x-tick-${i}`}
              style={{
                position: "absolute",
                left: toScreenX(i),
                bottom: -5,
                width: 2,
                height: 10,
                backgroundColor: "#333",
              }}
            >
              <Text
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: -5,
                  fontSize: 10,
                  color: "#333",
                }}
              >
                {i}
              </Text>
            </View>
          ))}

          {/* Vạch chia trên trục y */}
          {[...Array(roomHeight + 1)].map((_, i) => (
            <View
              key={`y-tick-${i}`}
              style={{
                position: "absolute",
                left: -5,
                bottom: toScreenY(i),
                width: 10,
                height: 2,
                backgroundColor: "#333",
              }}
            >
              <Text
                style={{
                  position: "absolute",
                  left: -25,
                  top: -5,
                  fontSize: 10,
                  color: "#333",
                }}
              >
                {i}
              </Text>
            </View>
          ))}

          {/* Điểm neo 1 */}
          <View
            style={[
              styles.anchor,
              {
                left: anchor1Pos.x,
                top: anchor1Pos.y,
                backgroundColor: "#3498db",
              },
            ]}
          />

          {/* Điểm neo 2 */}
          <View
            style={[
              styles.anchor,
              {
                left: anchor2Pos.x,
                top: anchor2Pos.y,
                backgroundColor: "#2ecc71",
              },
            ]}
          />

          {/* Vị trí ESP32 (User) với animation */}
          <Animated.View
            style={[
              styles.user,
              {
                transform: [
                  { translateX: animatedPosition.x },
                  { translateY: animatedPosition.y },
                ],
              },
            ]}
          />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#3498db" }]} />
            <Text style={{ fontSize: 16, color: "#2c3e50" }}>
              Điểm neo 1 ({anchorPoints.anchor1.longitude.toFixed(1)},{" "}
              {anchorPoints.anchor1.latitude.toFixed(1)})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#2ecc71" }]} />
            <Text style={{ fontSize: 16, color: "#2c3e50" }}>
              Điểm neo 2 ({anchorPoints.anchor2.longitude.toFixed(1)},{" "}
              {anchorPoints.anchor2.latitude.toFixed(1)})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#e74c3c" }]} />
            <Text style={{ fontSize: 16, color: "#2c3e50" }}>
              User: ({position.longitude.toFixed(1)},{" "}
              {position.latitude.toFixed(1)})
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.infoContainer}>
        <Text style={styles.info}>
          Khoảng cách vật cản: {position.obstacle} cm
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecf0f1",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    textAlign: "center",
  },
  gradientContainer: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  room: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#333",
    position: "relative",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  anchor: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    position: "absolute",
    marginLeft: -7.5,
    marginTop: -7.5,
    borderWidth: 1,
    borderColor: "#fff",
  },
  user: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e74c3c",
    position: "absolute",
    marginLeft: -10,
    marginTop: -10,
    borderWidth: 1,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  infoContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  info: {
    fontSize: 16,
    color: "#2c3e50",
  },
});

export default App;
