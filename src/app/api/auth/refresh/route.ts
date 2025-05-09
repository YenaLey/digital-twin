export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AuthClientThreeLegged } from "forge-apis";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    refresh_token,
    access_token,
    client_id,
    client_secret,
    callbackURL,
    scope,
  } = body;

  if (!refresh_token || !access_token || !client_id || !client_secret) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const three = new AuthClientThreeLegged(
      client_id,
      client_secret,
      callbackURL,
      scope
    );
    const newToken = await three.refreshToken({ refresh_token, access_token });
    return NextResponse.json({
      ...newToken,
      client_id,
      client_secret,
      callbackURL,
      scope,
    });
  } catch (error: unknown) {
    console.error("3-legged refresh error:", error);
    const message = error instanceof Error ? error.message : "Refresh error";

    type ForgeError = { response?: { status?: number } };
    let status = 500;
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as ForgeError).response?.status === "number"
    ) {
      status = (error as ForgeError).response!.status!;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
