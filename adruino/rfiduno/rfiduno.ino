#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9 

MFRC522 rfid(SS_PIN, RST_PIN); 

void setup() {
  Serial.begin(9600);
  while (!Serial); 

  SPI.begin();
  rfid.PCD_Init();
}

void loop() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardCode = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      cardCode += String(rfid.uid.uidByte[i], HEX);
    }

    Serial.print("Mã thẻ RFID: ");
    Serial.println(cardCode);

    Serial.println(cardCode);
    
    rfid.PICC_HaltA();  
  }
}
