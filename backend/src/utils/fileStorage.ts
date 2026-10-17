import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../middleware/errorHandler.js';

// Resolve uploads directory outside web public root
const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

// 5 MB limit
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types: PDF, PNG, JPG/JPEG, Markdown
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/markdown',
  'text/plain',
];

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate secure cryptographically random filename with preserved extension
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        `Unsupported file type: ${file.mimetype}. Allowed types are PDF, PNG, JPG, and Markdown.`
      )
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const getUploadRoot = (): string => UPLOAD_ROOT;
