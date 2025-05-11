import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      const { uploadKey, bucketKey, fileName, accessToken } = body;

      if (!uploadKey || !bucketKey || !fileName || !accessToken) {
        return NextResponse.json(
          { error: "Missing parameters" },
          { status: 400 }
        );
      }

      const authHeader = { Authorization: `Bearer ${accessToken}` };
      const baseUrl = "https://developer.api.autodesk.com/oss/v2";

      const finalizeRes = await fetch(
        `${baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(
          fileName
        )}/signeds3upload`,
        {
          method: "POST",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uploadKey }),
        }
      );

      if (!finalizeRes.ok) {
        const body = await finalizeRes.text();
        throw new Error(`Finalize failed: ${finalizeRes.status} ${body}`);
      }

      const urn = Buffer.from(
        `urn:adsk.objects:os.object:${bucketKey}/${fileName}`
      )
        .toString("base64")
        .replace(/=/g, "");

      return NextResponse.json({ urn });
    } catch (err) {
      console.error("Finalize upload error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unexpected error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }

  try {
    const formData = await request.formData();
    const token = formData.get("access_token");
    const file = formData.get("file");

    if (typeof token !== "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing or invalid access_token or file" },
        { status: 400 }
      );
    }

    const fileName = (file as File).name ?? `upload-${Date.now()}.bin`;
    const fileType = (file as File).type ?? "application/octet-stream";
    const bucketKey = `uploads-${Date.now()}`;
    const authHeader = { Authorization: `Bearer ${token}` };
    const baseUrl = "https://developer.api.autodesk.com/oss/v2";

    const bucketRes = await fetch(`${baseUrl}/buckets`, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
        "x-ads-region": "US",
      },
      body: JSON.stringify({ bucketKey, policyKey: "transient" }),
    });

    if (!bucketRes.ok && bucketRes.status !== 409) {
      const body = await bucketRes.text();
      throw new Error(`Bucket creation failed: ${bucketRes.status} ${body}`);
    }

    const signRes = await fetch(
      `${baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(
        fileName
      )}/signeds3upload`,
      { method: "GET", headers: authHeader }
    );

    if (!signRes.ok) {
      const body = await signRes.text();
      throw new Error(`Signed URL request failed: ${signRes.status} ${body}`);
    }

    const { uploadKey, urls } = (await signRes.json()) as {
      uploadKey: string;
      urls: string[];
    };

    if (!uploadKey || !urls?.[0]) {
      throw new Error("Invalid signedS3upload response");
    }

    const signedUrl = urls[0];
    const urn = Buffer.from(
      `urn:adsk.objects:os.object:${bucketKey}/${fileName}`
    )
      .toString("base64")
      .replace(/=/g, "");

    return NextResponse.json({
      signedUrl,
      uploadKey,
      bucketKey,
      fileName,
      fileType,
      urn,
    });
  } catch (err) {
    console.error("Upload route error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
