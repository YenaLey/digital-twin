# StepLED
![image](https://github.com/user-attachments/assets/568e615d-b8c2-4a11-9fa5-dd01503a4e3c)

세 개의 LED를 스위로 순차 제어하며, 이를 웹 가상 모델에서 실시간으로 모니터링하고 제어할 수 있는 양방향 디지털 트윈 시스템입니다.

- Forge Viewer에서 **가상 스위치** 클릭 → 실제 ESP32 보드의 **LED 상태 제어**
- ESP32 보드의 **실시간 상태 변화** → Tandem 및 웹 대시보드에 **동기화**

```
[Forge Viewer 웹 대시보드] ←→ [ESP32 장치]
          ↑                       ↓
     [Autodesk Tandem] ←────→ [LED 상태 업데이트]
```

## ⚙️ 주요 기술 스택

- ESP32 + Arduino
- Autodesk Tandem API (3-legged OAuth)
- Autodesk Forge Viewer (2-legged OAuth)
- Next.js

## 🧪 실행 방법

1. `.env` 파일 생성:

```env
NEXT_PUBLIC_FORGE_ACCESS_TOKEN=<2-Legged Token>
NEXT_PUBLIC_FORGE_URN=<Forge URN>

TANDEM_TOKEN=<3-Legged Token>
TANDEM_MODEL_URN=<Tandem Model URN>

ESP32_HOST=http://[ESP32 IP]
```

2. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

3. 웹 접속  
   `http://localhost:3000`

## 📝 앞으로의 개선 방향

- Polling 방식 → WebSocket / MQTT 이벤트 기반 통신으로 전환

## 📷 시연 이미지
<div align="left">
  <img alt="image" src="https://github.com/user-attachments/assets/d31aec71-2bd1-4e65-baf5-63bdc32da4be" width="35%"/>
</div>

[시연 동영상](https://pub-80a42cc7d41749078071917a4265d3ca.r2.dev/StepLED.mp4)
