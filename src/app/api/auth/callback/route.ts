import { NextResponse } from "next/server";
import { AuthClientThreeLegged } from "forge-apis";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  const [client_id, client_secret] = Buffer.from(state, "base64")
    .toString()
    .split(":");

  const callbackURL = `${url.origin}/auth/callback`;
  const scope = [
    "data:read",
    "data:write",
    "bucket:read",
    "bucket:create",
    "viewables:read",
  ];

  try {
    const three = new AuthClientThreeLegged(
      client_id,
      client_secret,
      callbackURL,
      scope
    );
    const tokenInfo = await three.getToken(code);

    return NextResponse.json({
      access_token: tokenInfo.access_token,
      refresh_token: tokenInfo.refresh_token,
      expires_in: tokenInfo.expires_in,
      client_id,
      client_secret,
      callbackURL,
      scope,
    });
  } catch (error: any) {
    console.error("3-legged callback error:", error);
    return NextResponse.json(
      { error: error.message || "Callback error" },
      { status: error.response?.status || 500 }
    );
  }
}
