import { NextResponse } from "next/server";
import { AuthClientTwoLegged } from "forge-apis";

interface TwoLeggedBody {
  client_id: string;
  client_secret: string;
}

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
    return NextResponse.json(token);
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
