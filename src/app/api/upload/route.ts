import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const token = form.get("access_token");
    const file = form.get("file");

    if (typeof token !== "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing or invalid access_token or file" },
        { status: 400 }
      );
    }

    const blob = file as Blob & { name?: string; type?: string; size?: number };
    const fileName = blob.name ?? "upload.bin";
    const bucketKey = `uploads-${Date.now()}`;
    const authHeader = { Authorization: `Bearer ${token}` };
    const baseUrl = "https://developer.api.autodesk.com/oss/v2";

    {
      const res = await fetch(`${baseUrl}/buckets`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
          "x-ads-region": "US",
        },
        body: JSON.stringify({ bucketKey, policyKey: "transient" }),
      });
      if (![200, 201, 409].includes(res.status)) {
        const body = await res.text();
        throw new Error(`Bucket creation failed: ${res.status} ${body}`);
      }
    }

    const signRes = await fetch(
      `${baseUrl}/buckets/${encodeURIComponent(
        bucketKey
      )}/objects/${encodeURIComponent(fileName)}/signeds3upload`,
      { method: "GET", headers: authHeader }
    );
    if (!signRes.ok) {
      const body = await signRes.text();
      throw new Error(`Signed URL request failed: ${signRes.status} ${body}`);
    }
    const signData = (await signRes.json()) as {
      uploadKey: string;
      urls?: string[];
    };
    const { uploadKey, urls } = signData;
    if (!uploadKey || !Array.isArray(urls) || urls.length === 0) {
      throw new Error(
        `Invalid signeds3upload response: ${JSON.stringify(signData)}`
      );
    }
    const signedUrl = urls[0];

    {
      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Content-Length": String(blob.size),
        },
        body: blob,
      });
      if (!putRes.ok) {
        const body = await putRes.text();
        throw new Error(`S3 upload failed: ${putRes.status} ${body}`);
      }
    }

    const finalizeRes = await fetch(
      `${baseUrl}/buckets/${encodeURIComponent(
        bucketKey
      )}/objects/${encodeURIComponent(fileName)}/signeds3upload`,
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
      throw new Error(`Finalize upload failed: ${finalizeRes.status} ${body}`);
    }

    const urn = Buffer.from(
      `urn:adsk.objects:os.object:${bucketKey}/${fileName}`
    )
      .toString("base64")
      .replace(/=/g, "");
    return NextResponse.json({ urn });
  } catch (err) {
    console.error("Upload route error:", err);

    const errorMessage =
      err instanceof Error ? err.message : "Unexpected error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
