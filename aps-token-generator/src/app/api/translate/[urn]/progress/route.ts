import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ urn: string }> }
) {
  const { urn } = await params;

  const accessToken = request.nextUrl.searchParams.get("accessToken");
  if (!accessToken) {
    return NextResponse.json(
      { error: "accessToken query is required" },
      { status: 400 }
    );
  }

  const manifestUrl = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(
    urn
  )}/manifest`;

  try {
    const res = await fetch(manifestUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 200) {
      const manifest = (await res.json()) as Manifest;
      const progress = manifest.progress ?? manifest.status;
      return NextResponse.json(
        { progress, status: manifest.status },
        { status: 200 }
      );
    }

    return NextResponse.json({ progress: "pending" }, { status: 202 });
  } catch (err: unknown) {
    console.error("Progress API error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
