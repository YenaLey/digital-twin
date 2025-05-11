import { NextResponse, NextRequest } from "next/server";
import { AuthClientTwoLegged, DerivativesApi } from "forge-apis";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TranslateRequestBody;
  const { urn } = body;
  if (!urn) {
    return NextResponse.json({ error: "URN is required" }, { status: 400 });
  }

  const clientId = process.env.FORGE_CLIENT_ID;
  const clientSecret = process.env.FORGE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing Forge credentials");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const auth = new AuthClientTwoLegged(clientId, clientSecret, [
    "data:read",
    "data:write",
    "data:create",
  ]);
  await auth.authenticate();

  const derivatives = new DerivativesApi();
  try {
    await derivatives.translate(urn, { xAdsForce: true }, auth, auth);
    return NextResponse.json({ status: "pending", urn });
  } catch (err: unknown) {
    console.error("Translate API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
