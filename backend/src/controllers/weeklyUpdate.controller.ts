import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { sendNotification } from '../services/notificationService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const submitWeeklyUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      projectId,
      weekStartDate,
      weekEndDate,
      plannedTasks,
      completedTasks,
      progressStatus,
      evidenceLinks,
      challenges,
      nextWeekPlan,
      isDraft,
    } = req.body;

    if (!projectId || !weekStartDate || !weekEndDate || !plannedTasks) {
      res.status(400).json({ error: 'Missing required weekly update fields' });
      return;
    }

    const start = new Date(weekStartDate);
    const end = new Date(weekEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Please provide valid ISO 8601 date strings.' });
      return;
    }

    const update = await prisma.weeklyUpdate.create({
      data: {
        studentId: req.user.id,
        projectId,
        weekStartDate: start,
        weekEndDate: end,
        plannedTasks,
        completedTasks: completedTasks || '',
        progressStatus: progressStatus || 'In Progress',
        evidenceLinks: Array.isArray(evidenceLinks)
          ? evidenceLinks
          : typeof evidenceLinks === 'string' && evidenceLinks.trim().length > 0
          ? [evidenceLinks.trim()]
          : [],
        challenges: challenges || null,
        nextWeekPlan: nextWeekPlan || '',
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      },
    });

    // Audit Log for submission
    if (!isDraft) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'SUBMIT_WEEKLY_UPDATE',
          targetEntity: 'WeeklyUpdate',
          targetId: update.id,
          details: { projectId, progressStatus },
        },
      });
    }

    res.status(201).json({
      success: true,
      data: update,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit weekly update', details: (error as Error).message });
  }
};

export const getMyUpdates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updates = await prisma.weeklyUpdate.findMany({
      where: { studentId: req.user.id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            domain: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly updates', details: (error as Error).message });
  }
};

export const getUpdatesByProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const updates = await prisma.weeklyUpdate.findMany({
      where: { projectId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
                displayName: true,
                department: true,
              },
            },
          },
        },
        reviews: true,
      },
      orderBy: { weekStartDate: 'desc' },
    });

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project updates', details: (error as Error).message });
  }
};

export const getReviewQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = await prisma.weeklyUpdate.findMany({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
                displayName: true,
                department: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review queue', details: (error as Error).message });
  }
};

export const reviewWeeklyUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments, decision } = req.body; // VERIFIED or REVISION_REQUIRED

    if (!['VERIFIED', 'REVISION_REQUIRED', 'UNDER_REVIEW'].includes(decision)) {
      res.status(400).json({ error: 'Invalid decision. Must be VERIFIED or REVISION_REQUIRED' });
      return;
    }

    const update = await prisma.weeklyUpdate.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!update) {
      res.status(404).json({ error: 'Weekly update not found' });
      return;
    }

    // Record review
    await prisma.mentorReview.create({
      data: {
        weeklyUpdateId: id,
        reviewerId: req.user!.id,
        comments: comments || 'Reviewed',
        decision,
      },
    });

    // Update status
    const updated = await prisma.weeklyUpdate.update({
      where: { id },
      data: { status: decision },
    });

    // Notify student via dual-channel notification engine (In-portal + Email)
    await sendNotification({
      userId: update.studentId,
      userEmail: update.student?.email,
      title: `Weekly Update: ${decision}`,
      message: `Mentor feedback: ${comments || 'No specific remarks'}`,
      type: 'WEEKLY_UPDATE',
      sendEmail: true,
    });

    // Audit Log
    await logAuditEvent({
      actorId: req.user?.id,
      action: `REVIEW_WEEKLY_UPDATE_${decision}`,
      targetEntity: 'WeeklyUpdate',
      targetId: id,
      details: { decision, comments },
    });

    res.json({
      success: true,
      message: `Weekly update status updated to ${decision}`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review weekly update', details: (error as Error).message });
  }
};
