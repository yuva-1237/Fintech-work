import { PrismaClient, Role, ProjectStatus, WeeklyUpdateStatus, HackathonStatus, DocumentStatus, MagazineArticleStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for FinTech Innovation Team Portal...');

  // Standard passwords for instant testing
  const adminPasswordHash = await bcrypt.hash('Admin@2026', 10);
  const generalPasswordHash = await bcrypt.hash('ChangeMe123!', 10);

  // 1. Super Admin Account (From Prompt 4)
  const admin = await prisma.userAccount.upsert({
    where: { email: 'admin@fintech.college.edu' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@fintech.college.edu',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  // Secondary institutional Super Admin
  const superAdmin = await prisma.userAccount.upsert({
    where: { email: 'superadmin@prathyusha.edu.in' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'superadmin@prathyusha.edu.in',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  // 2. Sample Mentor Account (From Prompt 4)
  const mentor = await prisma.userAccount.upsert({
    where: { email: 'mentor@fintech.college.edu' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'mentor@fintech.college.edu',
      passwordHash: adminPasswordHash,
      role: Role.MENTOR,
      isActive: true,
    },
  });

  // Secondary institutional mentor
  await prisma.userAccount.upsert({
    where: { email: 'mentor@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'mentor@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.MENTOR,
      isActive: true,
    },
  });

  // 3. Coordinator / Faculty Admin
  const coordinator = await prisma.userAccount.upsert({
    where: { email: 'coordinator@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'coordinator@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.FACULTY_ADMIN,
      isActive: true,
    },
  });

  // 4. Magazine Editor
  const editor = await prisma.userAccount.upsert({
    where: { email: 'editor@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'editor@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.MAGAZINE_EDITOR,
      isActive: true,
    },
  });

  // 5. Management Viewer
  await prisma.userAccount.upsert({
    where: { email: 'management@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'management@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.MANAGEMENT_VIEWER,
      isActive: true,
    },
  });

  // 6. Student Account (Priyan A)
  const student = await prisma.userAccount.upsert({
    where: { email: 'priyan@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'priyan@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          fullName: 'Priyan A',
          displayName: 'Priyan A',
          registerNumber: '111421205042',
          department: 'Information Technology',
          program: 'B.Tech IT',
          academicYear: '2023-2027',
          yearOfStudy: 3,
          skills: ['React', 'TypeScript', 'Node.js', 'Python', 'Financial AI'],
          fintechInterests: ['Algorithmic Trading', 'Payment Analytics', 'Fraud Detection'],
          bio: 'Building thoughtful financial technology and resilient real-time payment solutions.',
          portfolioLinks: {
            github: 'https://github.com/priyan-fintech',
            linkedin: 'https://linkedin.com/in/priyan-fintech',
          },
          isPublicVisible: true,
        },
      },
    },
  });

  // 7. Team Lead Account
  const teamLead = await prisma.userAccount.upsert({
    where: { email: 'teamlead@prathyusha.edu.in' },
    update: { passwordHash: generalPasswordHash },
    create: {
      email: 'teamlead@prathyusha.edu.in',
      passwordHash: generalPasswordHash,
      role: Role.TEAM_LEAD,
      isActive: true,
      studentProfile: {
        create: {
          fullName: 'Ananya Sharma',
          displayName: 'Ananya S',
          registerNumber: '111421205012',
          department: 'Computer Science and Engineering',
          program: 'B.E CSE',
          academicYear: '2023-2027',
          yearOfStudy: 3,
          skills: ['FastAPI', 'PyTorch', 'Data Pipelines', 'React'],
          fintechInterests: ['High-Frequency Systems', 'RegTech'],
          bio: 'Team Lead for ML-driven anomaly detection in financial networks.',
          isPublicVisible: true,
        },
      },
    },
  });

  // 8. Focus Area / Sample Approved Project (From Prompt 4)
  const project1 = await prisma.project.create({
    data: {
      title: 'AI-Enabled Expense Categorization Engine',
      domain: 'AI in Finance',
      abstract: 'Automated machine learning classification of retail financial transactions.',
      problemStatement: 'Manual transaction tagging is error-prone and time-consuming.',
      objectives: 'Build a lightweight neural model for real-time categorization.',
      expectedOutcome: 'Working prototype with REST endpoints and frontend dashboard.',
      techStack: ['Python', 'FastAPI', 'React', 'PostgreSQL'],
      repoUrl: 'https://github.com/pec-fintech/expense-categorizer',
      demoUrl: 'https://demo.fintech.prathyusha.edu.in/expense',
      status: ProjectStatus.ACTIVE,
      isPublic: true,
      mentorId: mentor.id,
      startDate: new Date('2026-01-10'),
      members: {
        create: [
          { userId: student.id, roleInTeam: 'Frontend & API Integration' },
          { userId: teamLead.id, roleInTeam: 'Team Lead' },
        ],
      },
      tasks: {
        create: [
          { title: 'Document API responses and edge cases', status: 'COMPLETED' },
          { title: 'Implement transaction summary UI', status: 'IN_PROGRESS' },
          { title: 'Validate benchmark dataset import', status: 'NOT_STARTED' },
        ],
      },
    },
  });

  // Project 2: Payment Analytics
  await prisma.project.create({
    data: {
      title: 'Autonomous Payment Analytics Platform',
      domain: 'Institutional Payments',
      abstract: 'Real-time telemetry and risk anomaly scoring for UPI and IMPS high-volume transaction switches.',
      problemStatement: 'Payment drop-offs and transient gateway faults lack sub-second diagnostic visibility.',
      objectives: 'Stream transaction events, isolate latency bottlenecks, and detect settlement discrepancies.',
      expectedOutcome: 'Sub-second real-time streaming dashboard with automated incident alerting.',
      techStack: ['Node.js', 'Express', 'React', 'TimescaleDB', 'Redis'],
      repoUrl: 'https://github.com/pec-fintech/payment-analytics',
      status: ProjectStatus.ACTIVE,
      isPublic: true,
      mentorId: mentor.id,
      startDate: new Date('2026-02-01'),
      members: {
        create: [{ userId: student.id, roleInTeam: 'Lead Contributor' }],
      },
    },
  });

  // 9. Create Weekly Update & Mentor Review
  await prisma.weeklyUpdate.create({
    data: {
      studentId: student.id,
      projectId: project1.id,
      weekStartDate: new Date('2026-10-01'),
      weekEndDate: new Date('2026-10-07'),
      plannedTasks: 'Integrate transaction CSV parsing and clean categorization API endpoints.',
      completedTasks: 'Parsed 15k test bank statements; achieved 97.4% precision on test set.',
      progressStatus: 'On Track',
      evidenceLinks: ['https://github.com/pec-fintech/expense-categorizer/pull/14'],
      challenges: 'Handling non-standard merchant transaction descriptors.',
      nextWeekPlan: 'Add UI unit test coverage and complete mentor revision feedback.',
      status: WeeklyUpdateStatus.VERIFIED,
      reviews: {
        create: {
          reviewerId: mentor.id,
          comments: 'Excellent documentation and clean PR. Continue testing against ambiguous vendor names.',
          decision: WeeklyUpdateStatus.VERIFIED,
        },
      },
    },
  });

  // 10. Create Contribution Log
  await prisma.contributionLog.create({
    data: {
      projectId: project1.id,
      studentId: student.id,
      taskArea: 'Data Engineering & ML',
      description: 'Built data-cleaning pipeline and synthetic statement generator with 50 edge cases.',
      evidenceUrl: 'https://github.com/pec-fintech/expense-categorizer/pull/12',
      periodDate: new Date('2026-10-05'),
      status: DocumentStatus.VERIFIED,
      mentorRemarks: 'Verified in peer code review and benchmarked.',
      verifiedAt: new Date(),
    },
  });

  // 11. Create Hackathon & Verified Certificate
  await prisma.hackathon.create({
    data: {
      eventName: 'National FinTech Hackathon 2026',
      organizer: 'IIT Madras Research Park & NPCI',
      theme: 'Offline UPI & Sub-second Settlement',
      problemStatement: 'Devise resilient store-and-forward offline micropayment validation.',
      venueMode: 'In-person',
      eventStartDate: new Date('2026-09-15'),
      eventEndDate: new Date('2026-09-17'),
      officialUrl: 'https://fintechhackathon.org.in',
      teamName: 'Team Prathyusha FinTech Alpha',
      teamLeadId: teamLead.id,
      solutionTitle: 'Sound-Wave Cryptographic Token Offline Ledger',
      abstract: 'Zero-internet peer-to-merchant token transfer using near-ultrasound encryption.',
      prototypeUrl: 'https://github.com/pec-fintech/soundwave-pay',
      outcome: 'Winner — 1st Place National Level',
      status: HackathonStatus.VERIFIED,
      isVerified: true,
      isPublic: true,
      members: {
        create: [
          { userId: teamLead.id, roleInTeam: 'Team Lead' },
          { userId: student.id, roleInTeam: 'Security & Protocol Developer' },
        ],
      },
      documents: {
        create: {
          studentId: student.id,
          fileUrl: './uploads/NPCI_National_Winner_Certificate.pdf',
          fileName: 'NPCI_National_Winner_Certificate.pdf',
          fileType: 'Certificate',
          status: DocumentStatus.VERIFIED,
          remarks: 'Verified against official NPCI portal roll.',
          verifiedBy: coordinator.id,
          verifiedAt: new Date(),
        },
      },
    },
  });

  // 12. Create Magazine Issue & Article
  await prisma.magazineIssue.create({
    data: {
      volumeNo: 1,
      monthYear: 'October 2026',
      title: 'Inaugural Edition: Decentralized Financial Systems and Real-Time Rails',
      pdfUrl: './uploads/fintech_issue_01.pdf',
      isPublished: true,
      publishedAt: new Date('2026-10-01'),
      articles: {
        create: [
          {
            authorId: student.id,
            title: 'Sub-Zero Latency: Behind the Scenes of High-Throughput Payment Switches',
            category: 'Tech Explainer',
            content: `The modern economy demands real-time payment settlement with five-nines reliability. In this article, we analyze the core architectural patterns powering sub-second messaging queues, idempotent transaction validation, and how distributed consensus prevents double-spend anomalies across asynchronous bank networks.`,
            status: MagazineArticleStatus.PUBLISHED,
            editorNotes: 'Approved for inaugural print and digital distribution.',
          },
        ],
      },
    },
  });

  // 13. Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_BOOTSTRAP',
      targetEntity: 'System',
      targetId: 'INIT',
      details: { seeded: true, version: '1.0.0' },
    },
  });

  console.log('✅ Database seeded successfully with default roles and projects.');
  console.log('Credentials:');
  console.log('  Admin:       admin@fintech.college.edu    / Admin@2026');
  console.log('  Super Admin: superadmin@prathyusha.edu.in / Admin@2026');
  console.log('  Mentor:      mentor@fintech.college.edu   / Admin@2026');
  console.log('  Student:     priyan@prathyusha.edu.in     / ChangeMe123!');
  console.log('  Team Lead:   teamlead@prathyusha.edu.in   / ChangeMe123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
