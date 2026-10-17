import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

// Public endpoint: Aggregate showcase for Landing Page
export const getPublicData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [projects, innovators, hackathons, latestMagazine] = await Promise.all([
      // Only public & active/approved/completed projects
      prisma.project.findMany({
        where: {
          isPublic: true,
          status: { in: ['APPROVED', 'ACTIVE', 'COMPLETED'] },
        },
        select: {
          id: true,
          title: true,
          domain: true,
          abstract: true,
          objectives: true,
          expectedOutcome: true,
          techStack: true,
          repoUrl: true,
          demoUrl: true,
          status: true,
          startDate: true,
        },
        take: 6,
      }),

      // Only student profiles with explicit public consent (isPublicVisible = true)
      // OMIT sensitive private data such as registerNumber, userId, timestamps
      prisma.studentProfile.findMany({
        where: {
          isPublicVisible: true,
          user: { isActive: true },
        },
        select: {
          id: true,
          displayName: true,
          department: true,
          academicYear: true,
          yearOfStudy: true,
          skills: true,
          fintechInterests: true,
          bio: true,
          portfolioLinks: true,
          avatarUrl: true,
        },
        take: 8,
      }),

      // Only verified and public hackathon achievements
      prisma.hackathon.findMany({
        where: {
          isVerified: true,
          isPublic: true,
        },
        select: {
          id: true,
          eventName: true,
          organizer: true,
          theme: true,
          venueMode: true,
          teamName: true,
          solutionTitle: true,
          abstract: true,
          outcome: true,
          eventStartDate: true,
          eventEndDate: true,
        },
        take: 6,
      }),

      // Latest published magazine issue
      prisma.magazineIssue.findFirst({
        where: { isPublished: true },
        orderBy: { volumeNo: 'desc' },
        include: {
          articles: {
            where: { status: 'PUBLISHED' },
            select: {
              id: true,
              title: true,
              category: true,
              content: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        projects,
        innovators,
        achievements: hackathons,
        magazine: latestMagazine,
        focusAreas: [
          'Algorithmic Trading & High-Frequency Systems',
          'Autonomous Payment Analytics & Anomaly Detection',
          'Decentralized Finance (DeFi) & Smart Contract Verification',
          'Regulatory Compliance (RegTech) & AML Automation',
          'AI-Assisted Credit Scoring & Alternative Data',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public showcase data', details: (error as Error).message });
  }
};

// Public endpoint: List public projects
export const getPublicProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        isPublic: true,
        status: { in: ['APPROVED', 'ACTIVE', 'COMPLETED'] },
      },
      select: {
        id: true,
        title: true,
        domain: true,
        abstract: true,
        objectives: true,
        expectedOutcome: true,
        techStack: true,
        repoUrl: true,
        demoUrl: true,
        status: true,
        startDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public projects', details: (error as Error).message });
  }
};

// Public endpoint: Meet our innovators (only consented students, registerNumber omitted)
export const getPublicInnovators = async (_req: Request, res: Response): Promise<void> => {
  try {
    const innovators = await prisma.studentProfile.findMany({
      where: {
        isPublicVisible: true,
        user: { isActive: true },
      },
      select: {
        id: true,
        displayName: true,
        department: true,
        program: true,
        academicYear: true,
        yearOfStudy: true,
        skills: true,
        fintechInterests: true,
        bio: true,
        portfolioLinks: true,
        avatarUrl: true,
      },
    });

    res.json({
      success: true,
      data: innovators,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public innovators', details: (error as Error).message });
  }
};

// Public endpoint: Public achievements
export const getPublicAchievements = async (_req: Request, res: Response): Promise<void> => {
  try {
    const achievements = await prisma.hackathon.findMany({
      where: {
        isVerified: true,
        isPublic: true,
      },
      select: {
        id: true,
        eventName: true,
        organizer: true,
        theme: true,
        teamName: true,
        solutionTitle: true,
        abstract: true,
        prototypeUrl: true,
        outcome: true,
        eventStartDate: true,
      },
      orderBy: { eventStartDate: 'desc' },
    });

    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public achievements', details: (error as Error).message });
  }
};
