import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { sendNotification } from '../services/notificationService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

// Public: Apply to join
export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName,
      displayName,
      email,
      registerNumber,
      department,
      program,
      academicYear,
      yearOfStudy,
      skills,
      fintechInterests,
      priorExperience,
      portfolioLinks,
      motivation,
      hasConsent,
    } = req.body;

    if (!fullName || !email || !registerNumber || !department || !program || !academicYear || !yearOfStudy) {
      res.status(400).json({ error: 'Missing required application fields' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.membershipApplication.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(400).json({ error: 'Application with this email already exists' });
      return;
    }

    const application = await prisma.membershipApplication.create({
      data: {
        fullName,
        displayName: displayName || fullName,
        email: normalizedEmail,
        registerNumber,
        department,
        program,
        academicYear,
        yearOfStudy: Number(yearOfStudy),
        skills: Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((s) => s.trim()) : [],
        fintechInterests: Array.isArray(fintechInterests)
          ? fintechInterests
          : typeof fintechInterests === 'string'
          ? fintechInterests.split(',').map((s) => s.trim())
          : [],
        priorExperience: priorExperience || null,
        portfolioLinks: portfolioLinks || null,
        motivation: motivation || '',
        hasConsent: Boolean(hasConsent),
        status: 'PENDING',
      },
    });

    res.status(201).json({
      ...application,
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit application', details: (error as Error).message });
  }
};

// Public: Check application status by email or ID
export const getApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, id } = req.query;

    if (!email && !id) {
      res.status(400).json({ error: 'Email or Application ID is required' });
      return;
    }

    const application = await prisma.membershipApplication.findFirst({
      where: {
        ...(id && { id: String(id) }),
        ...(email && { email: String(email).toLowerCase().trim() }),
      },
      select: {
        id: true,
        displayName: true,
        department: true,
        status: true,
        decisionNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status', details: (error as Error).message });
  }
};

// Admin: List all applications
export const listApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const applications = await prisma.membershipApplication.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(search && {
          OR: [
            { fullName: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
            { registerNumber: { contains: String(search), mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list applications', details: (error as Error).message });
  }
};

// Admin: Get single application
export const getApplicationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.membershipApplication.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application', details: (error as Error).message });
  }
};

// Admin: Approve / Reject / Request Clarification
export const reviewApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body; // decision: APPROVED, REJECTED, CLARIFICATION_REQUIRED

    if (!['APPROVED', 'REJECTED', 'CLARIFICATION_REQUIRED', 'SUSPENDED'].includes(decision)) {
      res.status(400).json({ error: 'Invalid decision status' });
      return;
    }

    const application = await prisma.membershipApplication.findUnique({ where: { id } });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const updatedApp = await prisma.membershipApplication.update({
      where: { id },
      data: {
        status: decision,
        decisionNote: note || null,
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, create UserAccount and StudentProfile automatically
    if (decision === 'APPROVED') {
      const existingUser = await prisma.userAccount.findUnique({
        where: { email: application.email },
      });

      if (!existingUser) {
        const defaultPassword = 'ChangeMe123!';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const user = await prisma.userAccount.create({
          data: {
            email: application.email,
            passwordHash,
            role: 'STUDENT',
            studentProfile: {
              create: {
                fullName: application.fullName,
                displayName: application.displayName,
                registerNumber: application.registerNumber,
                department: application.department,
                program: application.program,
                academicYear: application.academicYear,
                yearOfStudy: application.yearOfStudy,
                skills: application.skills,
                fintechInterests: application.fintechInterests,
                isPublicVisible: false,
              },
            },
          },
        });

        await sendNotification({
          userId: user.id,
          userEmail: application.email,
          title: 'Membership Approved',
          message: 'Welcome to Fintech Innovation Team! Your membership has been approved. Default password: ChangeMe123!',
          type: 'APPLICATION',
          sendEmail: true,
        });
      }
    }

    // Audit Log
    await logAuditEvent({
      actorId: req.user?.id,
      action: `REVIEW_APPLICATION_${decision}`,
      targetEntity: 'MembershipApplication',
      targetId: id,
      details: { decision, note },
    });

    res.json({
      ...updatedApp,
      success: true,
      message: `Application ${decision.toLowerCase().replace('_', ' ')} successfully`,
      data: updatedApp,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review application', details: (error as Error).message });
  }
};

// Public/Applicant: Respond to clarification request
export const respondClarification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { responseNote, updatedSkills, updatedInterests, portfolioLinks } = req.body;

    const application = await prisma.membershipApplication.findUnique({ where: { id } });
    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    const updated = await prisma.membershipApplication.update({
      where: { id },
      data: {
        status: 'PENDING',
        motivation: `${application.motivation}\n\n[Clarification Response]: ${responseNote || ''}`,
        ...(updatedSkills && { skills: updatedSkills }),
        ...(updatedInterests && { fintechInterests: updatedInterests }),
        ...(portfolioLinks && { portfolioLinks }),
      },
    });

    res.json({
      success: true,
      message: 'Clarification submitted. Application is now under review.',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond to clarification', details: (error as Error).message });
  }
};
