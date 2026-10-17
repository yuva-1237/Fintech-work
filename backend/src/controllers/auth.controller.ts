import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.userAccount.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        studentProfile: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-fintech-portal-key';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn }
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        targetEntity: 'UserAccount',
        targetId: user.id,
        details: { email: user.email, role: user.role },
      },
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentProfile: user.studentProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: (error as Error).message });
  }
};

export const getCurrentUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.userAccount.findUnique({
      where: { id: req.user.id },
      include: {
        studentProfile: true,
        assignedProjects: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Do not return passwordHash
    const { passwordHash, ...userSafe } = user;
    res.json({
      success: true,
      data: userSafe,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile', details: (error as Error).message });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { bio, skills, fintechInterests, portfolioLinks, avatarUrl, isPublicVisible, displayName } = req.body;

    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!existingProfile) {
      res.status(404).json({ error: 'Student profile not found for this user' });
      return;
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(displayName !== undefined && { displayName }),
        ...(skills !== undefined && { skills: Array.isArray(skills) ? skills : [skills] }),
        ...(fintechInterests !== undefined && {
          fintechInterests: Array.isArray(fintechInterests) ? fintechInterests : [fintechInterests],
        }),
        ...(portfolioLinks !== undefined && { portfolioLinks }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(isPublicVisible !== undefined && { isPublicVisible: Boolean(isPublicVisible) }),
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'UPDATE_STUDENT_PROFILE',
        targetEntity: 'StudentProfile',
        targetId: updatedProfile.id,
        details: { isPublicVisible: updatedProfile.isPublicVisible },
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: (error as Error).message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Old password and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    const user = await prisma.userAccount.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.userAccount.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'CHANGE_PASSWORD',
        targetEntity: 'UserAccount',
        targetId: req.user.id,
      },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password', details: (error as Error).message });
  }
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    const users = await prisma.userAccount.findMany({
      where: {
        ...(role && { role: role as any }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        studentProfile: {
          select: {
            fullName: true,
            displayName: true,
            department: true,
            academicYear: true,
            yearOfStudy: true,
            isPublicVisible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list users', details: (error as Error).message });
  }
};

export const updateProfileVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { isPublicVisible } = req.body;

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user.id },
      data: { isPublicVisible: Boolean(isPublicVisible) },
    });

    await logAuditEvent({
      actorId: req.user.id,
      action: 'UPDATE_PUBLIC_VISIBILITY',
      targetEntity: 'StudentProfile',
      targetId: updatedProfile.id,
      details: { isPublicVisible: Boolean(isPublicVisible) },
    });

    res.json({
      success: true,
      message: 'Visibility preferences updated',
      isPublicVisible: updatedProfile.isPublicVisible,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update visibility preferences', details: (error as Error).message });
  }
};

export const requestDataRectification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { reason, fieldsToRectify } = req.body;

    await logAuditEvent({
      actorId: req.user.id,
      action: 'DATA_RECTIFICATION_REQUEST',
      targetEntity: 'UserAccount',
      targetId: req.user.id,
      details: { reason, fieldsToRectify },
    });

    // Notify coordinators
    const coordinators = await prisma.userAccount.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'FACULTY_ADMIN'] } },
    });

    for (const admin of coordinators) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Data Rectification Request',
          message: `User ${req.user.email} submitted a data rectification request: ${reason || 'Details in audit log'}`,
          type: 'APPLICATION',
        },
      });
    }

    res.json({
      success: true,
      message: 'Data rectification request recorded and forwarded to institutional coordinators.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record rectification request', details: (error as Error).message });
  }
};
