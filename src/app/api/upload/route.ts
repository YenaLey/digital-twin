/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  AuthClientTwoLegged,
  BucketsApi,
  ObjectsApi,
  DerivativesApi,
} from "forge-apis";

export const runtime = "nodejs";
export const config = { api: { bodyParser: false } };

export async function POST(request: Request) {
  const form = await request.formData();
  const rawToken = form.get("access_token");
  const fileBlob = form.get("file");

  if (typeof rawToken !== "string" || !(fileBlob instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing or invalid access_token / file" },
      { status: 400 }
    );
  }
  const accessToken = rawToken;
  const maybeName = (fileBlob as any).name;
  const filename = typeof maybeName === "string" ? maybeName : "upload.bin";

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const baseTmp = path.join(os.tmpdir(), "aps-upload");
  await fs.promises.mkdir(baseTmp, { recursive: true });
  const safeName = `${crypto.randomBytes(8).toString("hex")}-${filename}`;
  const tmpPath = path.join(baseTmp, safeName);
  await fs.promises.writeFile(tmpPath, buffer);

  const oauth2 = new AuthClientTwoLegged("", "", []);
  oauth2.setCredentials({ access_token: accessToken });

  const bucketKey = `bucket-${crypto.randomBytes(8).toString("hex")}`;
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

  const stats = await fs.promises.stat(tmpPath);
  const objectsApi = new ObjectsApi();
  const uploadRes = await objectsApi.uploadResources(
    bucketKey,
    [
      {
        objectKey: safeName,
        data: fs.createReadStream(tmpPath),
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
  if (!objectId) {
    return NextResponse.json({ error: "objectId not found" }, { status: 500 });
  }

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

  await fs.promises.unlink(tmpPath);

  return NextResponse.json({ urn });
}
