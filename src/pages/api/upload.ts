import type { NextApiRequest, NextApiResponse } from "next";
import { formidable, File as FormidableFile, Fields, Files } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<[Fields, Files]> {
  const form = formidable({ multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const [fields, files] = await parseForm(req);

    const fileInput = files.file;
    const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
    const token = Array.isArray(fields.access_token)
      ? fields.access_token[0]
      : fields.access_token;

    if (!file) {
      console.error("❌ Missing file. Raw files:", files);
      return res.status(400).json({ error: "Missing file" });
    }

    if (typeof token !== "string") {
      console.error("❌ Missing or invalid token. Raw fields:", fields);
      return res.status(400).json({ error: "Missing access token" });
    }

    const filepath = (file as FormidableFile).filepath;
    const fileName =
      (file as FormidableFile).originalFilename || `upload-${Date.now()}`;
    const fileType =
      (file as FormidableFile).mimetype || "application/octet-stream";

    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(filepath);
    } catch (readErr) {
      console.error("❌ Failed to read uploaded file from disk:", readErr);
      return res
        .status(500)
        .json({ error: "Failed to read file", details: String(readErr) });
    }

    const bucketKey = `uploads-${Date.now()}`;
    const authHeader = { Authorization: `Bearer ${token}` };
    const baseUrl = "https://developer.api.autodesk.com/oss/v2";

    // 1. Bucket 생성
    try {
      const createBucket = await fetch(`${baseUrl}/buckets`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
          "x-ads-region": "US",
        },
        body: JSON.stringify({ bucketKey, policyKey: "transient" }),
      });

      if (![200, 201, 409].includes(createBucket.status)) {
        const body = await createBucket.text();
        throw new Error(
          `Bucket creation failed: ${createBucket.status} ${body}`
        );
      }
    } catch (bucketErr) {
      console.error("❌ Bucket creation failed:", bucketErr);
      return res
        .status(500)
        .json({ error: "Bucket creation error", details: String(bucketErr) });
    }

    // 2. signed S3 업로드 URL 요청
    let signedUrl: string | undefined;
    let uploadKey: string | undefined;
    try {
      const signedRes = await fetch(
        `${baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(
          fileName
        )}/signeds3upload`,
        { method: "GET", headers: authHeader }
      );
      const signedData = await signedRes.json();
      signedUrl = signedData.urls?.[0];
      uploadKey = signedData.uploadKey;

      if (!signedUrl || !uploadKey) {
        throw new Error(
          `Invalid signed URL response: ${JSON.stringify(signedData)}`
        );
      }
    } catch (signErr) {
      console.error("❌ Signed URL fetch failed:", signErr);
      return res.status(500).json({
        error: "Failed to get signed upload URL",
        details: String(signErr),
      });
    }

    // 3. 실제 S3 업로드
    try {
      const s3Res = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileType,
          "Content-Length": String(fileBuffer.length),
        },
        body: fileBuffer,
      });

      if (!s3Res.ok) {
        const body = await s3Res.text();
        throw new Error(`S3 upload failed: ${s3Res.status} ${body}`);
      }
    } catch (s3Err) {
      console.error("❌ S3 upload failed:", s3Err);
      return res
        .status(500)
        .json({ error: "S3 upload failed", details: String(s3Err) });
    }

    // 4. 업로드 완료 finalization
    try {
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
    } catch (finalizeErr) {
      console.error("❌ Finalize failed:", finalizeErr);
      return res
        .status(500)
        .json({ error: "Finalize failed", details: String(finalizeErr) });
    }

    // 5. URN 생성 및 반환
    const urn = Buffer.from(
      `urn:adsk.objects:os.object:${bucketKey}/${fileName}`
    )
      .toString("base64")
      .replace(/=/g, "");

    return res.status(200).json({ urn });
  } catch (err) {
    console.error("❌ Unexpected upload error:", err);
    return res
      .status(500)
      .json({ error: "Unexpected error", details: String(err) });
  }
}
