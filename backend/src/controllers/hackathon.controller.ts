import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';

export const createHackathon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      eventName,
      organizer,
      theme,
      problemStatement,
      venueMode,
      eventStartDate,
      eventEndDate,
      officialUrl,
      teamName,
      solutionTitle,
      abstract,
      prototypeUrl,
      members, // Array of { userId: string, roleInTeam?: string }
    } = req.body;

    if (!eventName || !organizer || !theme || !venueMode || !eventStartDate || !eventEndDate || !teamName || !solutionTitle) {
      res.status(400).json({ error: 'Missing required hackathon registration fields' });
      return;
    }

    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Please provide valid ISO 8601 date strings for eventStartDate and eventEndDate.' });
      return;
    }

    const hackathon = await prisma.hackathon.create({
      data: {
        eventName,
        organizer,
        theme,
        problemStatement: problemStatement || null,
        venueMode,
        eventStartDate: start,
        eventEndDate: end,
        officialUrl: officialUrl || null,
        teamName,
        teamLeadId: req.user.id,
        solutionTitle,
        abstract: abstract || null,
        prototypeUrl: prototypeUrl || null,
        status: 'SUBMITTED',
        isVerified: false,
        isPublic: false,
        members: {
          create: [
            {
              userId: req.user.id,
              roleInTeam: 'Team Lead',
            },
            ...(Array.isArray(members)
              ? members
                  .filter((m: any) => m.userId && m.userId !== req.user?.id)
                  .map((m: any) => ({
                    userId: m.userId,
                    roleInTeam: m.roleInTeam || 'Team Member',
                  }))
              : []),
          ],
        },
      },
      include: {
        members: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'REGISTER_HACKATHON',
        targetEntity: 'Hackathon',
        targetId: hackathon.id,
        details: { eventName, teamName },
      },
    });

    res.status(201).json({
      success: true,
      data: hackathon,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hackathon', details: (error as Error).message });
  }
};

export const listHackathons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, isVerified, isPublic, search } = req.query;

    const hackathons = await prisma.hackathon.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(isVerified !== undefined && { isVerified: isVerified === 'true' }),
        ...(isPublic !== undefined && { isPublic: isPublic === 'true' }),
        ...(search && {
          OR: [
            { eventName: { contains: String(search), mode: 'insensitive' } },
            { teamName: { contains: String(search), mode: 'insensitive' } },
            { theme: { contains: String(search), mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        teamLead: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
                displayName: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                studentProfile: {
                  select: {
                    fullName: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        documents: true,
      },
      orderBy: { eventStartDate: 'desc' },
    });

    res.json({
      success: true,
      data: hackathons,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list hackathons', details: (error as Error).message });
  }
};

export const getHackathonById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        teamLead: {
          select: {
            id: true,
            email: true,
            studentProfile: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                studentProfile: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    if (!hackathon) {
      res.status(404).json({ error: 'Hackathon not found' });
      return;
    }

    res.json({
      success: true,
      data: hackathon,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hackathon', details: (error as Error).message });
  }
};

export const updateOutcome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { outcome, prototypeUrl, abstract } = req.body;

    const hackathon = await prisma.hackathon.update({
      where: { id },
      data: {
        outcome,
        ...(prototypeUrl && { prototypeUrl }),
        ...(abstract && { abstract }),
        status: 'RESULT_SUBMITTED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'UPDATE_HACKATHON_OUTCOME',
        targetEntity: 'Hackathon',
        targetId: id,
        details: { outcome },
      },
    });

    res.json({
      success: true,
      data: hackathon,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update outcome', details: (error as Error).message });
  }
};

export const uploadCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // hackathonId
    const { fileUrl, fileName, fileType, remarks, studentId } = req.body;

    if (!fileUrl || !fileName || !fileType) {
      res.status(400).json({ error: 'fileUrl, fileName, and fileType are required' });
      return;
    }

    const certificate = await prisma.documentCertificate.create({
      data: {
        hackathonId: id,
        studentId: studentId || req.user?.id || 'unknown',
        fileUrl,
        fileName,
        fileType,
        remarks: remarks || null,
        status: 'UPLOADED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'UPLOAD_CERTIFICATE',
        targetEntity: 'DocumentCertificate',
        targetId: certificate.id,
        details: { hackathonId: id, fileName },
      },
    });

    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload certificate', details: (error as Error).message });
  }
};

export const verifyHackathon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isVerified, isPublic, status } = req.body;

    const hackathon = await prisma.hackathon.update({
      where: { id },
      data: {
        isVerified: isVerified !== undefined ? Boolean(isVerified) : true,
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
        status: status || 'VERIFIED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'VERIFY_HACKATHON',
        targetEntity: 'Hackathon',
        targetId: id,
        details: { isVerified, isPublic },
      },
    });

    res.json({
      success: true,
      message: 'Hackathon verified successfully',
      data: hackathon,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify hackathon', details: (error as Error).message });
  }
};

export const verifyCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { certId } = req.params;
    const { status, remarks } = req.body; // status: VERIFIED, CORRECTION_REQUIRED, RESTRICTED

    const certificate = await prisma.documentCertificate.update({
      where: { id: certId },
      data: {
        status,
        remarks: remarks || null,
        verifiedBy: req.user?.id,
        verifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: `VERIFY_CERTIFICATE_${status}`,
        targetEntity: 'DocumentCertificate',
        targetId: certId,
        details: { status, remarks },
      },
    });

    res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify certificate', details: (error as Error).message });
  }
};
