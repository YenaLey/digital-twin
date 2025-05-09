export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AuthClientThreeLegged } from "forge-apis";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  const decoded = decodeURIComponent(stateParam);
  const [client_id, client_secret] = Buffer.from(decoded, "base64")
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
  } catch (err: unknown) {
    console.error("3-legged callback error:", err);
    const message = err instanceof Error ? err.message : "Callback error";
    type ForgeError = { response?: { status?: number } };
    let status = 500;
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as ForgeError).response?.status === "number"
    ) {
      status = (err as ForgeError).response!.status!;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
