import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';

export const exportContributionsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, academicYear, status } = req.query;

    const contributions = await prisma.contributionLog.findMany({
      include: {
        student: { include: { studentProfile: true } },
        project: true,
      },
      where: {
        ...(status && { status: status as any }),
        ...(department && {
          student: {
            studentProfile: {
              department: String(department),
            },
          },
        }),
        ...(academicYear && {
          student: {
            studentProfile: {
              academicYear: String(academicYear),
            },
          },
        }),
      },
      orderBy: { periodDate: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contributions');

    worksheet.columns = [
      { header: 'Student Name', key: 'name', width: 22 },
      { header: 'Register No (Audit)', key: 'regNo', width: 16 },
      { header: 'Department', key: 'dept', width: 18 },
      { header: 'Project', key: 'project', width: 28 },
      { header: 'Task Area', key: 'taskArea', width: 16 },
      { header: 'Description', key: 'desc', width: 35 },
      { header: 'Evidence URL', key: 'evidence', width: 28 },
      { header: 'Verification Status', key: 'status', width: 18 },
      { header: 'Mentor Remarks', key: 'remarks', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };

    contributions.forEach((c) => {
      worksheet.addRow({
        name: c.student.studentProfile?.fullName || 'N/A',
        regNo: c.student.studentProfile?.registerNumber || 'N/A',
        dept: c.student.studentProfile?.department || 'N/A',
        project: c.project.title,
        taskArea: c.taskArea,
        desc: c.description,
        evidence: c.evidenceUrl,
        status: c.status,
        remarks: c.mentorRemarks || 'N/A',
        date: c.periodDate.toISOString().split('T')[0],
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=contributions_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate contributions export', details: (error as Error).message });
  }
};

export const exportHackathonsReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isVerified } = req.query;

    const hackathons = await prisma.hackathon.findMany({
      where: {
        ...(isVerified !== undefined && { isVerified: isVerified === 'true' }),
      },
      include: {
        teamLead: { include: { studentProfile: true } },
        members: { include: { user: { include: { studentProfile: true } } } },
      },
      orderBy: { eventStartDate: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hackathons');

    worksheet.columns = [
      { header: 'Event Name', key: 'eventName', width: 25 },
      { header: 'Organizer', key: 'organizer', width: 22 },
      { header: 'Theme', key: 'theme', width: 20 },
      { header: 'Team Name', key: 'teamName', width: 20 },
      { header: 'Team Lead', key: 'teamLead', width: 22 },
      { header: 'Solution Title', key: 'solution', width: 30 },
      { header: 'Outcome', key: 'outcome', width: 18 },
      { header: 'Verified', key: 'verified', width: 12 },
      { header: 'Start Date', key: 'startDate', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    };

    hackathons.forEach((h) => {
      worksheet.addRow({
        eventName: h.eventName,
        organizer: h.organizer,
        theme: h.theme,
        teamName: h.teamName,
        teamLead: h.teamLead.studentProfile?.fullName || h.teamLead.email,
        solution: h.solutionTitle,
        outcome: h.outcome || 'Pending',
        verified: h.isVerified ? 'VERIFIED' : 'UNVERIFIED',
        startDate: h.eventStartDate.toISOString().split('T')[0],
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=hackathons_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate hackathons export', details: (error as Error).message });
  }
};

export const generatePdfSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });
    const verifiedContributions = await prisma.contributionLog.count({ where: { status: 'VERIFIED' } });
    const pendingContributions = await prisma.contributionLog.count({ where: { status: 'UPLOADED' } });
    const verifiedHackathons = await prisma.hackathon.count({ where: { isVerified: true } });
    const totalMembers = await prisma.userAccount.count({ where: { role: 'STUDENT' } });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fintech_summary_report_${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc
      .fontSize(18)
      .fillColor('#111827')
      .text('PRATHYUSHA ENGINEERING COLLEGE', { align: 'center' });
    doc
      .fontSize(14)
      .fillColor('#4B5563')
      .text('Fintech Innovation Team — Executive Management Summary', { align: 'center' });
    doc.moveDown();

    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text(`Generated on: ${new Date().toLocaleString()} | Requester: ${req.user?.email || 'System'}`, {
        align: 'center',
      });
    doc.moveDown(2);

    // Section 1: Overview
    doc.fontSize(14).fillColor('#1E3A8A').text('1. Key Metrics & Status Overview');
    doc.moveDown(0.5);

    const metrics = [
      ['Total Enrolled Student Members:', `${totalMembers}`],
      ['Total Projects in Pipeline:', `${totalProjects}`],
      ['Active Development Projects:', `${activeProjects}`],
      ['Verified Student Contributions:', `${verifiedContributions}`],
      ['Pending Contribution Audits:', `${pendingContributions}`],
      ['Verified Hackathon Participations & Awards:', `${verifiedHackathons}`],
    ];

    metrics.forEach(([label, val]) => {
      doc.fontSize(11).fillColor('#1F2937').text(`${label.padEnd(45, ' ')} ${val}`);
    });

    doc.moveDown(2);

    // Section 2: Verified vs Unverified Integrity
    doc.fontSize(14).fillColor('#1E3A8A').text('2. Verification & Institutional Integrity');
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#374151')
      .text(
        'In strict compliance with institutional requirements, unverified achievements, unverified certificates, ' +
        'and unconsented student profiles remain restricted to internal audit and coordinator review queues. ' +
        'Only mentor-verified and coordinator-verified deliverables are published to the public showcase.'
      );

    doc.moveDown(3);
    doc.fontSize(9).fillColor('#9CA3AF').text('Fintech Innovation Team Portal • Prathyusha Engineering College • Confidential', {
      align: 'center',
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF summary', details: (error as Error).message });
  }
};
