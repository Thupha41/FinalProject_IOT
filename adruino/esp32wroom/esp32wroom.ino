#include <Arduino.h>
#include <NimBLEDevice.h>

// === HC-SR04 ===
#define TRIG_PIN 5
#define ECHO_PIN 18
#define n 3
#define A -60 

// === LED Indicators ===
#define LED_XANH 21   // LED xanh
#define LED_DO   22    // LED đỏ
#define LED_VANG 23    // LED vàng

// === BLE UUIDs ===
static const NimBLEUUID serviceUUID("DEAD"); // UUID cho ESP32S
static const NimBLEUUID phoneServiceUUID("0000baad-0000-1000-8000-00805f9b34fb"); // UUID cho PhoneServer
static const NimBLEUUID charUUID("BEEF"); // UUID cho characteristic

static const NimBLEAdvertisedDevice* advDevice1; // Đối tượng cho DEAD
static const NimBLEAdvertisedDevice* advDevice2; // Đối tượng cho PhoneServer
static bool doConnect1 = false; // Biến kiểm tra kết nối với DEAD
static bool doConnect2 = false; // Biến kiểm tra kết nối với PhoneServer
static uint32_t scanTimeMs = 5000; // Thời gian quét trong milliseconds

class ClientCallbacks : public NimBLEClientCallbacks {
    void onConnect(NimBLEClient* pClient) override {
        Serial.printf("Đã kết nối với: %s\n", pClient->getPeerAddress().toString().c_str());
        digitalWrite(LED_DO, HIGH); // Nháy LED đỏ khi kết nối thành công
    }

    void onDisconnect(NimBLEClient* pClient, int reason) override {
        Serial.printf("%s Ngắt kết nối, lý do = %d - Bắt đầu quét\n", pClient->getPeerAddress().toString().c_str(), reason);
        NimBLEDevice::getScan()->start(scanTimeMs, false, true);
        digitalWrite(LED_DO, LOW); // Tắt LED đỏ khi ngắt kết nối
    }
};

class ScanCallbacks : public NimBLEScanCallbacks {
    void onResult(const NimBLEAdvertisedDevice* advertisedDevice) override {
        Serial.printf("Advertised Device found: %s, RSSI: %d\n", advertisedDevice->toString().c_str(), advertisedDevice->getRSSI());

        if (advertisedDevice->isAdvertisingService(serviceUUID)) {
            Serial.printf("Found Our Service (DEAD)\n");
            advDevice1 = advertisedDevice; // Save reference for ESP32
            doConnect1 = true;
        }

        if (advertisedDevice->isAdvertisingService(phoneServiceUUID)) {
            Serial.printf("Found PhoneServer\n");
            advDevice2 = advertisedDevice; // Save reference for PhoneServer
            doConnect2 = true;
        }
    }
};

ScanCallbacks scanCallbacks;

void notifyCB(NimBLERemoteCharacteristic* pRemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    std::string value = std::string((char*)pData, length);
    Serial.printf("Nhận notify từ server: %s\n", value.c_str());
}

bool connectToServer(const NimBLEAdvertisedDevice* advDevice) {
    NimBLEClient* pClient = NimBLEDevice::createClient();

    Serial.println("🔗 Đang kết nối tới server...");
    if (!pClient->connect(advDevice)) {
        Serial.println("❌ Kết nối thất bại.");
        return false;
    }

    // Đăng ký notify
    BLERemoteService* pRemoteService = pClient->getService(serviceUUID);
    if (pRemoteService == nullptr) {
        Serial.println("⚠️ Không tìm thấy service.");
        return false;
    }

    BLERemoteCharacteristic* pRemoteCharacteristic = pRemoteService->getCharacteristic(charUUID);
    if (pRemoteCharacteristic == nullptr) {
        Serial.println("⚠️ Không tìm thấy characteristic.");
        return false;
    }

    // Sử dụng subscribe() để nhận notify
    if (pRemoteCharacteristic->canNotify()) {
        pRemoteCharacteristic->subscribe(true, notifyCB);
    }

    return true;
}

long readUltrasonic() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH);
    return duration * 0.034 / 2.0; // Tính toán khoảng cách
}

void setup() {
    Serial.begin(115200);
    pinMode(LED_XANH, OUTPUT);
    pinMode(LED_DO, OUTPUT);
    pinMode(LED_VANG, OUTPUT);
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);

    NimBLEDevice::init("NimBLE-Client");
    NimBLEDevice::setPower(3);  // Set transmit power (optional)
}

void loop() {
    float distance1 = 0.0;
    float distance2 = 0.0;

    if (!doConnect1 && !doConnect2) {
        NimBLEScan* pScan = NimBLEDevice::getScan();
        pScan->setScanCallbacks(&scanCallbacks, false);
        pScan->setInterval(100);
        pScan->setWindow(100);
        pScan->setActiveScan(true);
        pScan->start(scanTimeMs);
        Serial.printf("Scanning for peripherals\n");
    }

    // Connect to DEAD
    if (doConnect1) {
        doConnect1 = false; // Reset trạng thái kết nối
        if (advDevice1) {
            digitalWrite(LED_XANH, HIGH); // Bật LED xanh khi bắt đầu kết nối
            Serial.println("Connecting to DEAD...");
            if (connectToServer(advDevice1)) {
                int rssi = NimBLEDevice::getClientByPeerAddress(advDevice1->getAddress())->getRssi();
                distance1 = pow(10, (A - rssi) / (10 * n));  // Tính khoảng cách
                Serial.printf("Estimated Distance to DEAD: %.2f meters\n", distance1);
                delay(500);
                digitalWrite(LED_XANH, LOW); // Tắt LED xanh
            }
            NimBLEDevice::getClientByPeerAddress(advDevice1->getAddress())->disconnect(); // Ngắt kết nối
        }
    }

    // Connect to PhoneServer
    if (doConnect2) {
        doConnect2 = false; // Reset trạng thái kết nối
        if (advDevice2) {
            digitalWrite(LED_XANH, HIGH); // Bật LED xanh khi bắt đầu kết nối
            Serial.println("Connecting to PhoneServer...");
            if (connectToServer(advDevice2)) {
                int rssi = NimBLEDevice::getClientByPeerAddress(advDevice2->getAddress())->getRssi();
                distance2 = pow(10, (A - rssi) / (10 * n));  // Tính khoảng cách
                Serial.printf("Estimated Distance to PhoneServer: %.2f meters\n", distance2);
                delay(500);
                digitalWrite(LED_XANH, LOW); // Tắt LED xanh
            }
            NimBLEDevice::getClientByPeerAddress(advDevice2->getAddress())->disconnect(); // Ngắt kết nối
        }
    }

    // Đo khoảng cách với HC-SR04
    delay(500);
    long cm = readUltrasonic();
    digitalWrite(LED_VANG, HIGH);
    delay(500);
    digitalWrite(LED_VANG, LOW);
    delay(500);
    
    if (cm > 0) {
        Serial.printf("Khoảng cách vật cản: %.2f cm\n", (float)cm);
        if (cm < 30) {
            Serial.println("⚠️ Vật cản quá gần!");
            digitalWrite(LED_VANG, HIGH);
            delay(200);
            digitalWrite(LED_VANG, LOW);
            delay(200);
        } else {
            digitalWrite(LED_VANG, LOW);
        }
    }

    // In dữ liệu gửi qua WebSocket
    Serial.printf("Sending data: { \"dummy_id\": \"0001\", \"distance1\": %.2f, \"distance2\": %.2f, \"obstacle_distance\": %.2f }\n", distance1, distance2, (float)cm);
    Serial.println(distance1);
    Serial.println(distance2);
    Serial.println(cm);
    delay(500); // Chờ giữa các lần đo
}
