#include <SPI.h>
#include <MFRC522.h>

// Định nghĩa chân kết nối RFID
#define SS_PIN 10
#define RST_PIN 9

// Định nghĩa chân đèn LED
#define LED_RED 4
#define LED_YELLOW 2
#define LED_GREEN 3

MFRC522 mfrc522(SS_PIN, RST_PIN);

void blinkLEDAnalog(int pin, int duration) {
    analogWrite(pin, 200); // Sáng mức 200
    delay(duration);        // Giữ sáng trong thời gian duration (ms)
    analogWrite(pin, 0);    // Tắt đèn
    delay(duration);  
}

void setup() {
    Serial.begin(9600); // Khởi động Serial Monitor
    SPI.begin();        // Bắt đầu giao tiếp SPI
    mfrc522.PCD_Init(); // Khởi động module RFID
    
    // Cấu hình chân LED là OUTPUT
    pinMode(LED_RED, OUTPUT);
    pinMode(LED_YELLOW, OUTPUT);
    pinMode(LED_GREEN, OUTPUT);

    // Nháy đèn đỏ hai lần khi khởi động
    for (int i = 0; i < 2; i++) {
        blinkLEDAnalog(LED_RED, 500);
        blinkLEDAnalog(LED_RED, 500);
        blinkLEDAnalog(LED_RED, 500);

    }

    // Nháy đèn vàng báo hiệu sẵn sàng quét thẻ
    
}

void loop() {
    // Kiểm tra xem có thẻ nào được đưa vào không
    if (!mfrc522.PICC_IsNewCardPresent()) {
        blinkLEDAnalog(LED_YELLOW, 500);
        blinkLEDAnalog(LED_YELLOW, 500);
        blinkLEDAnalog(LED_YELLOW, 500);

        return; 
    }

    // Đọc UID của thẻ RFID
    if (!mfrc522.PICC_ReadCardSerial()) {
        blinkLEDAnalog(LED_YELLOW, 500);
        blinkLEDAnalog(LED_YELLOW, 500);
        blinkLEDAnalog(LED_YELLOW, 500);

        return; // Không thể đọc thẻ, thoát vòng lặp
    }


    // Nháy đèn xanh để báo quét thành công
    blinkLEDAnalog(LED_GREEN, 500);
    blinkLEDAnalog(LED_GREEN, 500);
    blinkLEDAnalog(LED_GREEN, 500);

    // In UID của thẻ lên Serial Monitor
    Serial.print("RFID UID: ");
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        Serial.print(mfrc522.uid.uidByte[i], HEX);
        Serial.print(" ");
    }
    Serial.println();

    // Chờ 2 giây rồi quay lại trạng thái chờ quét
    delay(2000);
}
