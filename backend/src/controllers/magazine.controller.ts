import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';

export const submitArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title, category, content, issueId, isDraft } = req.body;

    if (!title || !category || !content) {
      res.status(400).json({ error: 'Title, category, and content are required' });
      return;
    }

    const article = await prisma.magazineArticle.create({
      data: {
        title,
        category,
        content,
        issueId: issueId || null,
        authorId: req.user.id,
        status: isDraft ? 'DRAFT' : 'SUBMITTED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: isDraft ? 'DRAFT_ARTICLE' : 'SUBMIT_ARTICLE',
        targetEntity: 'MagazineArticle',
        targetId: article.id,
        details: { title, category },
      },
    });

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit article', details: (error as Error).message });
  }
};

export const getMyArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const articles = await prisma.magazineArticle.findMany({
      where: { authorId: req.user.id },
      include: {
        issue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your articles', details: (error as Error).message });
  }
};

export const listArticles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, issueId, category, search } = req.query;

    const articles = await prisma.magazineArticle.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(issueId && { issueId: String(issueId) }),
        ...(category && { category: String(category) }),
        ...(search && {
          OR: [
            { title: { contains: String(search), mode: 'insensitive' } },
            { category: { contains: String(search), mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        author: {
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
        issue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list articles', details: (error as Error).message });
  }
};

export const getArticleById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await prisma.magazineArticle.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            studentProfile: true,
          },
        },
        issue: true,
      },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article', details: (error as Error).message });
  }
};

export const editArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, category, content, status, editorNotes, issueId } = req.body;

    const article = await prisma.magazineArticle.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(content && { content }),
        ...(status && { status }),
        ...(editorNotes !== undefined && { editorNotes }),
        ...(issueId !== undefined && { issueId }),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'EDIT_ARTICLE',
        targetEntity: 'MagazineArticle',
        targetId: id,
        details: { status, editorNotes },
      },
    });

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit article', details: (error as Error).message });
  }
};

export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { volumeNo, monthYear, title, pdfUrl } = req.body;

    if (!volumeNo || !monthYear || !title) {
      res.status(400).json({ error: 'volumeNo, monthYear, and title are required' });
      return;
    }

    const issue = await prisma.magazineIssue.create({
      data: {
        volumeNo: Number(volumeNo),
        monthYear,
        title,
        pdfUrl: pdfUrl || null,
        isPublished: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'CREATE_MAGAZINE_ISSUE',
        targetEntity: 'MagazineIssue',
        targetId: issue.id,
        details: { volumeNo, monthYear, title },
      },
    });

    res.status(201).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create issue', details: (error as Error).message });
  }
};

export const listIssues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const issues = await prisma.magazineIssue.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { volumeNo: 'desc' },
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list magazine issues', details: (error as Error).message });
  }
};

export const publishIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const issue = await prisma.magazineIssue.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    // Mark all approved/scheduled articles in this issue as PUBLISHED
    await prisma.magazineArticle.updateMany({
      where: {
        issueId: id,
        status: { in: ['APPROVED', 'SCHEDULED'] },
      },
      data: {
        status: 'PUBLISHED',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        action: 'PUBLISH_MAGAZINE_ISSUE',
        targetEntity: 'MagazineIssue',
        targetId: id,
        details: { volumeNo: issue.volumeNo, title: issue.title },
      },
    });

    res.json({
      success: true,
      message: 'Magazine issue published successfully',
      data: issue,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish magazine issue', details: (error as Error).message });
  }
};

// Public: Get published issues for showcase / archive
export const getPublishedIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    const issues = await prisma.magazineIssue.findMany({
      where: { isPublished: true },
      include: {
        articles: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            category: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                studentProfile: {
                  select: {
                    displayName: true,
                    department: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { volumeNo: 'desc' },
    });

    res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch published issues', details: (error as Error).message });
  }
};
