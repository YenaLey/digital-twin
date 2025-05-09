import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AuthClientTwoLegged,
  BucketsApi,
  ObjectsApi,
  DerivativesApi,
} from "forge-apis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const accessToken = formData.get("access_token");
    const file = formData.get("file") as File | null;

    if (typeof accessToken !== "string" || !file) {
      return NextResponse.json(
        { error: "Missing access_token or file" },
        { status: 400 }
      );
    }

    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const filename = crypto.randomBytes(8).toString("hex") + "-" + file.name;
    const filepath = path.join(tmpDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(filepath, buffer);

    const oauth2 = new AuthClientTwoLegged("", "", []);
    oauth2.setCredentials({ access_token: accessToken });

    const bucketKey = "bucket-" + crypto.randomBytes(8).toString("hex");
    const bucketsApi = new BucketsApi();
    try {
      await bucketsApi.getBucketDetails(
        bucketKey,
        oauth2,
        oauth2.getCredentials()
      );
    } catch {
      await bucketsApi.createBucket(
        { bucketKey, policyKey: "persistent" },
        { xAdsRegion: "US" },
        oauth2,
        oauth2.getCredentials()
      );
    }

    const stats = await fs.promises.stat(filepath);
    const objectsApi = new ObjectsApi();
    const uploadRes = await objectsApi.uploadResources(
      bucketKey,
      [
        {
          objectKey: path.basename(filepath),
          data: fs.createReadStream(filepath),
          length: stats.size,
        },
      ],
      {},
      oauth2,
      oauth2.getCredentials()
    );

    const objectId =
      uploadRes[0]?.completed?.objectId ||
      uploadRes[0]?.body?.uploaded?.[0]?.objectId;
    if (!objectId) throw new Error("objectId not found");

    const urn = Buffer.from(objectId).toString("base64");
    const derivativesApi = new DerivativesApi();
    await derivativesApi.translate(
      {
        input: { urn },
        output: { formats: [{ type: "svf", views: ["2d", "3d"] }] },
      },
      { xAdsForce: true },
      oauth2,
      oauth2.getCredentials()
    );

    try {
      await fs.promises.unlink(filepath);
    } catch (err) {
      console.warn("delete error:", err);
    }

    return NextResponse.json({ urn });
  } catch (error: unknown) {
    console.error("upload error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
