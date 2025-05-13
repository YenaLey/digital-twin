# APS 토큰 생성기

Autodesk Platform Services(APS)의 2-legged 및 3-legged 인증 방식을 통해 APS Access Token을 생성할 수 있습니다.

## APS 애플리케이션 설정

1. https://aps.autodesk.com/ 에 접속합니다.
2. **2-Legged (Server to Server)**
   - “Server to Server” 방식으로 새 애플리케이션을 생성합니다.
   - Client ID와 Client Secret을 복사합니다.
3. **3-Legged (Traditional Web App)**
   - “Traditional Web App” 방식으로 새 애플리케이션을 생성합니다.
   - Callback URL에 다음을 추가합니다:
     ```
     http://aps-token-generator.netlify.app/auth/callback
     ```
   - Client ID와 Client Secret을 복사합니다.

## 주요 기능

### 2-Legged Flow

- Client ID와 Client Secret 입력
- Access Token 발급
- 만료 60초 전에 자동 갱신
- Model URN 발급 (⚠️ 주의: 이 기능은 로컬 환경에서만 정상 작동합니다. Netlify 배포 환경에서는 대용량 파일 처리 제한으로 인해 오류가 발생할 수 있습니다.)
  1. OSS 버킷에 파일 업로드
  2. Model Derivative 변환 요청
  3. Model URN 발급
  4. Model 3D 확인

### 3-Legged Flow

- Client ID와 Client Secret 입력
- Autodesk 로그인 페이지로 리디렉션
- Access Token 발급
- 만료 60초 전에 자동 갱신

## local dev

```bash
git clone https://github.com/YenaLey/aps-token-generator.git
cd aps-token-generator
npm install
npm run dev
```
