import { NextResponse } from "next/server";
import { AuthClientTwoLegged } from "forge-apis";

export async function POST(request: Request) {
  try {
    const { client_id, client_secret } =
      (await request.json()) as TwoLeggedBody;

    const two = new AuthClientTwoLegged(client_id, client_secret, [
      "data:read",
      "data:write",
      "data:create",
      "bucket:create",
      "bucket:read",
    ]);

    const token = await two.authenticate();

    const response = NextResponse.json({
      access_token: token.access_token,
      expires_in: token.expires_in,
    });

    response.cookies.set("forge_client_id", client_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    response.cookies.set("forge_client_secret", client_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: unknown) {
    console.error("twolegged error:", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    const status =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { status?: number } }).response?.status ===
        "number"
        ? (error as { response: { status: number } }).response.status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
