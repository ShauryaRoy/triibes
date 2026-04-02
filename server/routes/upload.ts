import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { db } from '../db';
import { posterCatalog } from '../../shared/schema';

const router = Router();

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tribbe-posters';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Log configuration (without exposing secrets)
console.log('🔧 R2 Configuration:', {
  accountId: R2_ACCOUNT_ID ? '✓ Set' : '✗ Missing',
  accessKeyId: R2_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing',
  secretKey: R2_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing',
  bucketName: R2_BUCKET_NAME,
  publicUrl: R2_PUBLIC_URL,
  endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'Not configured'
});

// Validation
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn('⚠️ Cloudflare R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env');
}

// Initialize S3 Client for R2 (R2 is S3-compatible)
const r2Client = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY ? new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null;

// Configure multer to store files in memory (not on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

/**
 * GET /api/upload/catalog
 * Fetch standard poster templates from the database
 */
router.get('/catalog', async (req: any, res) => {
  try {
    const posters = await db.select().from(posterCatalog);
    res.json(posters);
  } catch (error: any) {
    console.error('Failed to fetch poster catalog:', error);
    res.status(500).json({ error: 'Failed to fetch poster catalog' });
  }
});

/**
 * POST /api/upload/poster
 * Upload a poster image to Cloudflare R2
 */
router.post('/poster', upload.single('file'), async (req: any, res) => {
  try {
    // Check authentication (optional - uncomment if you want only logged-in users to upload)
    // if (!req.isAuthenticated?.() || !req.user) {
    //   return res.status(401).json({ error: 'Authentication required' });
    // }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if R2 is configured
    if (!r2Client) {
      return res.status(503).json({ 
        error: 'Image upload service not configured',
        message: 'Cloudflare R2 credentials are missing. Check your .env file.'
      });
    }

    console.log('📤 Uploading image to R2:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)}KB`,
      bucket: R2_BUCKET_NAME,
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    });

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const fileName = `posters/${uniqueId}.${fileExtension}`;

    console.log('📝 Uploading as:', fileName);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        originalName: req.file.originalname,
        uploadedAt: new Date().toISOString()
      }
    });

    console.log('🚀 Sending command to R2...');
    await r2Client.send(command);
    console.log('✅ R2 upload successful!');

    // Construct public URL
    // If R2_PUBLIC_URL is set, use it. Otherwise, construct default URL
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${fileName}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${fileName}`;

    console.log('✅ Image uploaded successfully:', {
      id: uniqueId,
      url: publicUrl,
      size: req.file.size
    });

    // Return the image URL and ID
    res.json({
      id: uniqueId,
      url: publicUrl,
      fileName: fileName,
      size: req.file.size,
      contentType: req.file.mimetype
    });

  } catch (error: any) {
    console.error('💥 R2 upload error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    res.status(500).json({ 
      error: 'Failed to upload image to R2', 
      message: error.message,
      details: error.code || error.name
    });
  }
});

/**
 * DELETE /api/upload/poster/:id
 * Delete a poster image from Cloudflare R2
 * Note: This deletes by unique ID. You need to store the full fileName in your database.
 */
router.delete('/poster/:fileName', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileName } = req.params;

    if (!r2Client) {
      return res.status(503).json({ 
        error: 'Image upload service not configured' 
      });
    }

    console.log('🗑️ Deleting image from R2:', fileName);

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName, // e.g., "posters/abc123.jpg"
    });

    await r2Client.send(command);

    console.log('✅ Image deleted successfully');

    res.json({ success: true, message: 'Image deleted successfully' });

  } catch (error: any) {
    console.error('💥 R2 delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete image from R2', 
      message: error.message 
    });
  }
});

export default router;
