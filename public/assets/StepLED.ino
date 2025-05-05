#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <WebServer.h>

// Wi-Fi 정보
const char* ssid = "<ssid>";
const char* password = "<password>";

// 핀 설정
const int buttonPin = 33;
const int ledPins[] = {27, 26, 25}; // 빨강, 초록, 노랑
int currentLed = 0;
int lastButtonState = HIGH;
int buttonState = HIGH;
int debounceDelay = 50;
unsigned long lastDebounceTime = 0;

// Webhook URL + Bearer Token (3-legged token)
const char* webhookUrl = "<webhookUrl>";
const char* token = "<token>";

// 각 StreamID를 담은 리스트
const char* statusIds[4] = {
  "AQAAAMnQ2pAQd0IOhK647hF6A30AAAAA",
  "AQAAAKBmehwDIEhirCRRkXjT_GIAAAAA",
  "AQAAAFTDpe_Zg0hFhKJalFYSkioAAAAA",
  "AQAAAOD64XPdz0X-pr2YAFp5BkEAAAAA"
};

// 웹서버 인스턴스 생성
WebServer server(80);

void setup() {
  Serial.begin(115200);

  // Wi-Fi 연결
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 핀 초기화
  for (int i = 0; i < 3; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  pinMode(buttonPin, INPUT_PULLUP);
  digitalWrite(ledPins[currentLed], HIGH); // 첫 LED 켜기
  sendToTandem(currentLed); // 초기 상태 전송

  // Viewer 제어용 핸들러 등록
  server.on("/toggle-led", HTTP_POST, handleToggleFromViewer);
  server.begin();
}

// 가상 Viewer에서 제어 요청 시 실행되는 함수
void handleToggleFromViewer() {
  Serial.println("[Viewer 요청 감지] /toggle-led");
  toggleLed(); // 아래 정의된 순환함수
  server.send(200, "text/plain", "LED toggled");
}

// 실제 LED 순환 로직
void toggleLed() {
  digitalWrite(ledPins[currentLed], LOW);
  currentLed = (currentLed + 1) % 3;
  digitalWrite(ledPins[currentLed], HIGH);
  sendToTandem(currentLed);
}

void loop() {
  server.handleClient(); // Viewer 요청 수신 대기

  int reading = digitalRead(buttonPin);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;

      if (buttonState == LOW) {
        toggleLed();
      }
    }
  }

  lastButtonState = reading;
}

void sendToTandem(int activeLed) {
  HTTPClient http;
  http.begin(webhookUrl);
  http.setTimeout(3000); // 최대 3초
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + token);

  // JSON 구성
  String payload = "[";
  for (int i = 0; i < 3; i++) {
    float value = (i == activeLed) ? 1.0 : 0.0;
    payload += "{\"id\":\"" + String(statusIds[i]) + "\",\"value\":" + String(value, 2) + "}";
    if (i < 2) payload += ",";
  }
  payload += ",{\"id\":\"" + String(statusIds[3]) + "\",\"value\":1.0}";

  // 디버깅 출력
  Serial.println("[Sending Webhook]");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  Serial.print("HTTP Response: ");
  Serial.println(httpCode);

  http.end();
}
