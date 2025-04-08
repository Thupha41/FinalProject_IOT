#include <Arduino.h>
#include <NimBLEDevice.h>

#define LED_RED     25
#define LED_YELLOW  26
#define LED_GREEN   27

static NimBLEServer* pServer;
static unsigned long connectionTime = 0; // Thời gian kết nối
static bool clientConnected = false; // Trạng thái kết nối
static int clientConnHandle = 0; // Handle của client

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
        Serial.printf("Client connected: %s\n", connInfo.getAddress().toString().c_str());
        
        // Đang kết nối, chưa mã hóa → bật đèn vàng
        digitalWrite(LED_RED, LOW);
        digitalWrite(LED_YELLOW, HIGH);
        digitalWrite(LED_GREEN, LOW);

        // Khởi động thời gian kết nối
        connectionTime = millis();
        clientConnected = true;
        clientConnHandle = connInfo.getConnHandle(); // Lưu handle của client
    }

    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
        Serial.println("Client disconnected, restarting advertising.");

        // Về trạng thái mặc định: đỏ sáng
        digitalWrite(LED_RED, HIGH);
        digitalWrite(LED_YELLOW, LOW);
        digitalWrite(LED_GREEN, LOW);

        NimBLEDevice::startAdvertising();
        clientConnected = false; // Reset trạng thái kết nối
    }

    void onAuthenticationComplete(NimBLEConnInfo& connInfo) override {
        if (!connInfo.isEncrypted()) {
            Serial.println("Encryption failed. Disconnecting.");

            // Đèn đỏ trở lại
            digitalWrite(LED_RED, HIGH);
            digitalWrite(LED_YELLOW, LOW);
            digitalWrite(LED_GREEN, LOW);

            pServer->disconnect(connInfo.getConnHandle());
        } else {
            Serial.printf("Secured connection to: %s\n", connInfo.getAddress().toString().c_str());

            // Thành công → đèn xanh
            digitalWrite(LED_RED, LOW);
            digitalWrite(LED_YELLOW, LOW);
            digitalWrite(LED_GREEN, HIGH);
        }
    }
};

ServerCallbacks serverCallbacks;

class CharCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override {
        std::string val = pCharacteristic->getValue();
        Serial.printf("Write to %s: %s\n",
                      pCharacteristic->getUUID().toString().c_str(),
                      val.c_str());
    }

    void onRead(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override {
        Serial.printf("Read from %s, value: %s\n",
                      pCharacteristic->getUUID().toString().c_str(),
                      pCharacteristic->getValue().c_str());
    }
} charCallbacks;

void setup() {
    Serial.begin(115200);
    Serial.println("Starting ESP32S NimBLE Server...");

    pinMode(LED_RED, OUTPUT);
    pinMode(LED_YELLOW, OUTPUT);
    pinMode(LED_GREEN, OUTPUT);

    digitalWrite(LED_RED, HIGH);    // Đèn đỏ sáng ban đầu
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, LOW);

    NimBLEDevice::init("ESP32S-Server");
    NimBLEDevice::setSecurityAuth(BLE_SM_PAIR_AUTHREQ_SC);

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(&serverCallbacks);

    NimBLEService* pService = pServer->createService("DEAD");

    NimBLECharacteristic* pChar = pService->createCharacteristic(
        "BEEF",
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::READ_ENC |   // Require encryption to read
        NIMBLE_PROPERTY::WRITE_ENC    // Require encryption to write
    );

    pChar->setValue("HelloBLE");
    pChar->setCallbacks(&charCallbacks);

    pService->start();

    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(pService->getUUID());
    pAdvertising->setName("ESP32S-Server");
    pAdvertising->start();

    Serial.println("Advertising started.");
}

void loop() {
    delay(1000); // Chờ 1 giây

    // Kiểm tra nếu client đã kết nối quá 1 giây
    if (clientConnected) {
        unsigned long elapsed = millis() - connectionTime; // Thời gian đã kết nối
        if (elapsed > 1000) { // Nếu kết nối lâu hơn 1 giây
            Serial.println("Disconnecting client due to long connection time...");
            pServer->disconnect(clientConnHandle); // Ngắt kết nối client
        }
    }
}
