import { Response } from 'express';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Protected File Stream Endpoint
 * GET /api/v1/documents/:id/download
 * Only the document owner, assigned mentor, or admin can access private files
 */
export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const doc = await prisma.documentCertificate.findUnique({
      where: { id },
      include: {
        hackathon: true,
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Role and ownership access check
    const isOwner = doc.studentId === req.user.id;
    const isAdmin = ['SUPER_ADMIN', 'FACULTY_ADMIN'].includes(req.user.role);
    const isMentor = req.user.role === 'MENTOR';

    if (!isOwner && !isAdmin && !isMentor) {
      res.status(403).json({ error: 'Access denied to restricted document' });
      return;
    }

    // Check physical file existence on disk
    if (!fs.existsSync(doc.fileUrl)) {
      res.status(404).json({ error: 'Physical file not found on storage disk' });
      return;
    }

    // Log the file access for audit
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'DOWNLOAD_DOCUMENT',
        targetEntity: 'DocumentCertificate',
        targetId: doc.id,
        details: { fileName: doc.fileName },
      },
    });

    // Stream download safely without exposing server path
    res.download(doc.fileUrl, doc.fileName);
  } catch (error) {
    res.status(500).json({ error: 'Failed to stream document', details: (error as Error).message });
  }
};

/**
 * Secure Document Upload
 * POST /api/v1/documents/upload
 */
export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.file) {
      throw new AppError(400, 'No file was provided for upload');
    }

    const { hackathonId, fileType, remarks } = req.body;

    const certificate = await prisma.documentCertificate.create({
      data: {
        studentId: req.user.id,
        hackathonId: hackathonId || null,
        fileUrl: req.file.path,
        fileName: req.file.originalname,
        fileType: fileType || 'Certificate',
        remarks: remarks || null,
        status: 'UPLOADED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'UPLOAD_DOCUMENT',
        targetEntity: 'DocumentCertificate',
        targetId: certificate.id,
        details: {
          fileName: certificate.fileName,
          fileType: certificate.fileType,
          sizeBytes: req.file.size,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'File securely uploaded and awaiting verification',
      data: {
        id: certificate.id,
        fileName: certificate.fileName,
        fileType: certificate.fileType,
        status: certificate.status,
        remarks: certificate.remarks,
        createdAt: certificate.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document', details: (error as Error).message });
  }
};

/**
 * List Accessible Documents
 * GET /api/v1/documents
 */
export const listDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isAdmin = ['SUPER_ADMIN', 'FACULTY_ADMIN'].includes(req.user.role);

    const documents = await prisma.documentCertificate.findMany({
      where: {
        ...(!isAdmin && { studentId: req.user.id }),
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        remarks: true,
        verifiedAt: true,
        createdAt: true,
        hackathon: {
          select: {
            id: true,
            eventName: true,
            teamName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list documents', details: (error as Error).message });
  }
};
