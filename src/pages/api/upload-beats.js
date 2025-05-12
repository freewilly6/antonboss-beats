// pages/api/upload-beats.js

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable Next.js body parsing so formidable can handle multipart
export const config = { api: { bodyParser: false } };

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const PUBLIC_R2_URL = process.env.PUBLIC_R2_URL;

function parseForm(req) {
  const uploadDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(uploadDir, { recursive: true });
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    multiples: false,
    maxFileSize: 1024 * 1024 * 1024, // 1 GB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (!PUBLIC_R2_URL) {
    console.error('❌ PUBLIC_R2_URL not set');
    return res.status(500).json({ error: 'Server misconfiguration: PUBLIC_R2_URL missing' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { fields, files } = await parseForm(req);
    console.log('Upload fields:', fields);
    console.log('Upload files:', files);

    // Pick up the 'folder' from the form
    const folder = (fields.folder || '').toString().trim();
    const fileField = files.file ?? Object.values(files)[0];
    const fileObj = Array.isArray(fileField) ? fileField[0] : fileField;
    const tempPath = fileObj.filepath || fileObj.path;
    if (!fileObj || !tempPath) {
      console.error('No valid file uploaded:', files);
      return res.status(400).json({ error: 'No valid file uploaded' });
    }

    // Build a safe, timestamped key, optionally prefixed by folder
    const originalName = fileObj.originalFilename || fileObj.filename || 'upload';
    const safeName = originalName.replace(/[^a-z0-9.\-_]/gi, '_');
    const key = `${folder ? folder + '/' : ''}${Date.now()}-${safeName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: fs.createReadStream(tempPath),
        ContentType: fileObj.mimetype || 'application/octet-stream',
      })
    );

    const url = `${PUBLIC_R2_URL}/${key}`;
    console.log('✅ Uploaded to R2, URL:', url);
    res.status(200).json({ url });
  } catch (err) {
    console.error('🔥 upload-beats error:', err);
    const status = err.httpCode || err.statusCode || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
  } finally {
    // cleanup tmp
    try {
      const tmpDir = path.join(process.cwd(), 'tmp');
      fs.readdirSync(tmpDir).forEach(f => fs.unlinkSync(path.join(tmpDir, f)));
    } catch (cleanupErr) {
      console.warn('Cleanup failed:', cleanupErr);
    }
  }
}
