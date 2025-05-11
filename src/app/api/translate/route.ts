import { NextRequest, NextResponse } from "next/server";
import { AuthClientTwoLegged, DerivativesApi } from "forge-apis";

interface TranslateRequestBody {
  urn?: string;
}

export async function POST(request: NextRequest) {
  const { urn } = (await request.json()) as TranslateRequestBody;

  if (!urn) {
    return NextResponse.json(
      { error: "URN이 제공되지 않았습니다." },
      { status: 400 }
    );
  }

  const clientId = request.cookies.get("forge_client_id")?.value;
  const clientSecret = request.cookies.get("forge_client_secret")?.value;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "인증 정보가 쿠키에 없습니다." },
      { status: 401 }
    );
  }

  const authClient = new AuthClientTwoLegged(clientId, clientSecret, [
    "data:read",
    "data:write",
    "data:create",
  ]);

  await authClient.authenticate();

  const derivativesApi = new DerivativesApi();

  const job = {
    input: {
      urn,
    },
    output: {
      formats: [{ type: "svf", views: ["2d", "3d"] }],
    },
  };

  try {
    const response = await derivativesApi.translate(
      job,
      { xAdsForce: true },
      authClient,
      authClient.getCredentials()
    );

    return NextResponse.json({
      status: "pending",
      urn,
      response: response.body,
    });
  } catch (error: unknown) {
    console.error("Translate API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message, details: error },
      { status: 500 }
    );
  }
}
