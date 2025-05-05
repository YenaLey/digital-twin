export async function POST() {
  try {
    const esp32Host = process.env.ESP32_HOST || "<http://[ESP32 IP]>";
    const response = await fetch(`${esp32Host}/toggle-led`, {
      method: "POST",
    });

    if (!response.ok) {
      console.error("ESP32 응답 실패:", await response.text());
      return new Response("ESP32 요청 실패", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("ESP32 연결 오류:", err);
    return new Response("ESP32 연결 오류", { status: 500 });
  }
}
