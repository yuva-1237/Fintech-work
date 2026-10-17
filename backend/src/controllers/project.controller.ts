import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { validateProjectChecklist } from '../services/projectVerification.js';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      domain,
      abstract,
      problemStatement,
      objectives,
      expectedOutcome,
      techStack,
      repoUrl,
      demoUrl,
      isPublic,
      mentorId,
      startDate,
      targetCompletion,
    } = req.body;

    if (!title || !domain || !abstract || !problemStatement) {
      res.status(400).json({ error: 'Title, domain, abstract, and problem statement are required' });
      return;
    }

    const project = await prisma.project.create({
      data: {
        title,
        domain,
        abstract,
        problemStatement,
        objectives: objectives || '',
        expectedOutcome: expectedOutcome || '',
        techStack: Array.isArray(techStack)
          ? techStack
          : typeof techStack === 'string'
          ? techStack.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        repoUrl: repoUrl || null,
        demoUrl: demoUrl || null,
        isPublic: Boolean(isPublic),
        mentorId: mentorId || null,
        startDate: startDate ? new Date(startDate) : null,
        targetCompletion: targetCompletion ? new Date(targetCompletion) : null,
        status: 'PROPOSED',
      },
    });

    // If caller is student/lead, add as member
    if (req.user?.id) {
      await prisma.projectMembership.create({
        data: {
          projectId: project.id,
          userId: req.user.id,
          roleInTeam: req.user.role === 'TEAM_LEAD' ? 'Lead' : 'Contributor',
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'CREATE_PROJECT',
        targetEntity: 'Project',
        targetId: project.id,
        details: { title: project.title, domain: project.domain },
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project', details: (error as Error).message });
  }
};

export const listProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, domain, search } = req.query;

    const projects = await prisma.project.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(domain && { domain: String(domain) }),
        ...(search && {
          OR: [
            { title: { contains: String(search), mode: 'insensitive' } },
            { domain: { contains: String(search), mode: 'insensitive' } },
            { abstract: { contains: String(search), mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        mentor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                studentProfile: {
                  select: {
                    fullName: true,
                    displayName: true,
                    department: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            weeklyUpdates: true,
            contributions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list projects', details: (error as Error).message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        mentor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                studentProfile: true,
              },
            },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        weeklyUpdates: {
          orderBy: { weekStartDate: 'desc' },
          take: 10,
        },
        contributions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project', details: (error as Error).message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      domain,
      abstract,
      problemStatement,
      objectives,
      expectedOutcome,
      techStack,
      repoUrl,
      demoUrl,
      status,
      isPublic,
      mentorId,
    } = req.body;

    if (status === 'COMPLETED') {
      const checklist = await validateProjectChecklist(id);
      if (!checklist.isValid) {
        res.status(400).json({
          error: 'Project does not satisfy Appendix B review checklist criteria for completion',
          issues: checklist.issues,
        });
        return;
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(domain && { domain }),
        ...(abstract && { abstract }),
        ...(problemStatement && { problemStatement }),
        ...(objectives && { objectives }),
        ...(expectedOutcome && { expectedOutcome }),
        ...(techStack !== undefined && {
          techStack: Array.isArray(techStack)
            ? techStack
            : typeof techStack === 'string'
            ? techStack.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        }),
        ...(repoUrl !== undefined && { repoUrl }),
        ...(demoUrl !== undefined && { demoUrl }),
        ...(status && { status }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
        ...(mentorId !== undefined && { mentorId }),
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'UPDATE_PROJECT',
        targetEntity: 'Project',
        targetId: id,
        details: { status, isPublic },
      },
    });

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project', details: (error as Error).message });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, roleInTeam } = req.body;

    if (!userId || !roleInTeam) {
      res.status(400).json({ error: 'User ID and roleInTeam are required' });
      return;
    }

    const membership = await prisma.projectMembership.upsert({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
      create: {
        projectId: id,
        userId,
        roleInTeam,
      },
      update: {
        roleInTeam,
      },
    });

    res.status(201).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add project member', details: (error as Error).message });
  }
};

export const addTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, dueDate } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        projectId: id,
        title,
        description: description || null,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'NOT_STARTED',
      },
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add task', details: (error as Error).message });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task', details: (error as Error).message });
  }
};

export const logContribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { projectId, taskArea, description, evidenceUrl, periodDate } = req.body;

    if (!projectId || !taskArea || !description || !evidenceUrl) {
      res.status(400).json({ error: 'Project ID, task area, description, and evidence URL are required' });
      return;
    }

    const contribution = await prisma.contributionLog.create({
      data: {
        projectId,
        studentId: req.user.id,
        taskArea,
        description,
        evidenceUrl,
        periodDate: periodDate ? new Date(periodDate) : new Date(),
        status: 'UPLOADED',
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'SUBMIT_CONTRIBUTION',
        targetEntity: 'ContributionLog',
        targetId: contribution.id,
        details: { taskArea, projectId },
      },
    });

    res.status(201).json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log contribution', details: (error as Error).message });
  }
};

export const reviewContribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: VERIFIED, CORRECTION_REQUIRED, UNDER_REVIEW

    const contribution = await prisma.contributionLog.update({
      where: { id },
      data: {
        status,
        mentorRemarks: remarks || null,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: `REVIEW_CONTRIBUTION_${status}`,
        targetEntity: 'ContributionLog',
        targetId: id,
        details: { status, remarks },
      },
    });

    res.json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to review contribution', details: (error as Error).message });
  }
};

export const getProjectVerificationChecklist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const checklist = await validateProjectChecklist(id);
    res.json({
      success: true,
      data: checklist,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate project checklist', details: (error as Error).message });
  }
};
