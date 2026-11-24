import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { seedDemoResumes, type DemoResume } from '@/server/demo-resume';

/** The homepage's sample presentation shows what a finished presentation looks like. */

type Work = { title: string; summary: string; slug: string };

async function addWork(tx: Prisma.TransactionClient, orgId: string, contactId: string, work: Work[]) {
  await tx.caseStudy.createMany({
    data: work.map((w, position) => ({
      orgId,
      contactId,
      url: `https://example.com/${w.slug}`,
      title: w.title,
      summary: w.summary,
      position,
    })),
  });
}

// ---- the homepage's sample presentation (sample-boards.ts) ----

const SAMPLE_RESUME: Omit<DemoResume, 'email'> = {
  resume: [
    'Product designer with eight years across B2B software, most recently leading design for Northbeam’s hiring platform.',
    '',
    'Northbeam — Design Lead, Hiring platform, Brooklyn, NY, Mar 2021–now. Built and ran a token-based design system mirrored in React; led the redesign of the candidate pipeline around stage aging.',
    '',
    'Tidewell Health — Product Designer, New York, NY, Jun 2018–Feb 2021. Care-coordination tools for nurses and care managers.',
    '',
    'Freelance — Product Designer, 2016–2018. Internal tools for logistics and fintech clients.',
    '',
    'BFA in Communication Design, Parsons School of Design, 2012–2016.',
  ].join('\n'),
  parsed: {
    summary:
      'Product designer with eight years across B2B software, most recently leading design for Northbeam’s hiring platform. I built and ran a token-based design system mirrored in React, which cut design QA time roughly in half, and led the redesign of the candidate pipeline around stage aging.\n\nBefore Northbeam I designed care-coordination tools at a digital health startup, where I learned to design for regulated workflows and very busy people.',
    skills: ['Design systems', 'Figma', 'Prototyping in React', 'User research', 'Information architecture', 'Healthcare UX', 'Workshop facilitation'],
    experience: [
      { title: 'Design Lead, Hiring platform', company: 'Northbeam', location: 'Brooklyn, NY', start: '2021-03', end: 'present' },
      { title: 'Product Designer', company: 'Tidewell Health', location: 'New York, NY', start: '2018-06', end: '2021-02' },
      { title: 'Product Designer', company: 'Freelance', location: 'Remote', start: '2016', end: '2018' },
    ],
    education: [{ school: 'Parsons School of Design', degree: 'BFA', field: 'Communication Design', start: '2012', end: '2016' }],
  },
};

const SAMPLE_WORK: Work[] = [
  { title: 'The candidate pipeline, rebuilt around stage aging', summary: 'Recruiters stopped losing people past a few hundred candidates; time to first touch fell about 30%.', slug: 'jordan-alvarez/stage-aging' },
  { title: 'A token-based design system, mirrored in React', summary: 'One source of truth for design and code, and half the design QA.', slug: 'jordan-alvarez/design-system' },
  { title: 'Care coordination for very busy nurses', summary: 'Tidewell Health’s care-team tools: fewer clicks between a page and the patient.', slug: 'jordan-alvarez/care-coordination' },
  { title: 'Reading a crowded dashboard at a glance', summary: 'Density versus scannability, settled with three rounds of testing.', slug: 'jordan-alvarez/density' },
];

/** The sample presentation's candidate gets a whole resume and their work. Idempotent; never throws. */
export async function ensureSampleWork(orgId: string, email: string) {
  try {
    const contact = await db.contact.findFirst({
      where: { orgId, emails: { has: email } },
      select: { id: true, resumeFileId: true, _count: { select: { caseStudies: true } } },
    });
    if (!contact) return;
    if (!contact._count.caseStudies) {
      await db.$transaction((tx) => addWork(tx, orgId, contact.id, SAMPLE_WORK));
    }
    if (!contact.resumeFileId) {
      await seedDemoResumes(orgId, [{ email, ...SAMPLE_RESUME }]);
    }
  } catch (error) {
    console.error('[sample] presentation work', error);
  }
}
