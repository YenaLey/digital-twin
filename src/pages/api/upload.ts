import type { NextApiRequest, NextApiResponse } from "next";
import { formidable, File as FormidableFile } from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const fileInput = files.file;
    const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
    const token = Array.isArray(fields.access_token)
      ? fields.access_token[0]
      : fields.access_token;

    if (!file || typeof token !== "string") {
      return res.status(400).json({ error: "Missing file or token" });
    }

    const filepath = (file as FormidableFile).filepath;
    const fileBuffer = fs.readFileSync(filepath);
    const fileName =
      (file as FormidableFile).originalFilename || `upload-${Date.now()}`;
    const fileType =
      (file as FormidableFile).mimetype || "application/octet-stream";
    const bucketKey = `uploads-${Date.now()}`;
    const authHeader = { Authorization: `Bearer ${token}` };
    const baseUrl = "https://developer.api.autodesk.com/oss/v2";

    // 1. Bucket 생성
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
      return res.status(500).json({ error: `Bucket creation failed: ${body}` });
    }

    // 2. signedS3upload
    const signedRes = await fetch(
      `${baseUrl}/buckets/${bucketKey}/objects/${encodeURIComponent(
        fileName
      )}/signeds3upload`,
      { method: "GET", headers: authHeader }
    );
    const signedData = await signedRes.json();
    const uploadKey = signedData.uploadKey;
    const signedUrl = signedData.urls?.[0];
    if (!signedUrl || !uploadKey) {
      return res.status(500).json({ error: "Failed to get signed upload URL" });
    }

    // 3. S3 업로드
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
      return res.status(500).json({ error: `S3 upload failed: ${body}` });
    }

    // 4. finalize
    const finalize = await fetch(
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
    if (!finalize.ok) {
      const body = await finalize.text();
      return res.status(500).json({ error: `Finalize failed: ${body}` });
    }

    // 5. URN 생성
    const urn = Buffer.from(
      `urn:adsk.objects:os.object:${bucketKey}/${fileName}`
    )
      .toString("base64")
      .replace(/=/g, "");

    return res.status(200).json({ urn });
  });
}
