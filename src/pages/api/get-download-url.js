// pages/api/get-download-url.js

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',  
  endpoint: process.env.R2_ENDPOINT,            // e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const key = req.query.key;
  if (!key || Array.isArray(key)) {
    return res.status(400).json({ error: 'Missing or invalid key parameter' });
  }

  // TODO: insert your AuthN/AuthZ here if you need to restrict access

  try {
    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,  // e.g. "beat-audio"
      Key: key,
    });

    // expiresIn is in seconds; adjust as needed (e.g. 60 = 1 minute)
    const url = await getSignedUrl(r2, cmd, { expiresIn: 60 });

    return res.status(200).json({ url });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: 'Could not generate signed URL' });
  }
}
