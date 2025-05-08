import { r2 } from "../../lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
  const { key } = req.query;   // e.g. /api/r2-sign?key=123/full.mp3
  if (!key) return res.status(400).send("Missing key");

  const cmd = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  });

  // expires in 15 minutes
  const url = await getSignedUrl(r2, cmd, { expiresIn: 900 });
  res.json({ url });
}
