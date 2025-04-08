import { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import io from 'socket.io-client';

const App = () => {
  const [position, setPosition] = useState({ latitude: 0, longitude: 0, obstacle: 0 });
  const SERVER_URL = process.env.SERVER_URL;
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socket.emit('identify', { type: 'react_native' });

    socket.on('update_position', (data) => {
      console.log('Received position:', data);
      setPosition({
        latitude: data.y,
        longitude: data.x,
        obstacle: data.obstacle_distance,
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude: position.latitude, longitude: position.longitude }}
          title="Người dùng"
          description={`Vật cản: ${position.obstacle} cm`}
        />
      </MapView>
      <Text style={styles.info}>Khoảng cách vật cản: {position.obstacle} cm</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  info: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'white', padding: 5 },
});

export default App;