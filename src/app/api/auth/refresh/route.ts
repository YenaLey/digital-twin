import { NextResponse } from "next/server";
import { AuthClientThreeLegged } from "forge-apis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refresh_token, client_id, client_secret, callbackURL, scope } =
      body;

    if (!refresh_token || !client_id || !client_secret) {
      return NextResponse.json(
        { error: "Missing refresh_token or client credentials" },
        { status: 400 }
      );
    }

    const three = new AuthClientThreeLegged(
      client_id,
      client_secret,
      callbackURL,
      scope
    );
    const newToken = await three.refreshToken({ refresh_token });

    return NextResponse.json({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_in: newToken.expires_in,
      client_id,
      client_secret,
      callbackURL,
      scope,
    });
  } catch (error: any) {
    console.error("3-legged refresh error:", error);
    return NextResponse.json(
      { error: error.message || "Refresh error" },
      { status: error.response?.status || 500 }
    );
  }
}
