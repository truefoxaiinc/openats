import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    candidateResumeParseJob: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/server/candidate-resume-storage', () => ({ openCandidateResume: vi.fn() }));
vi.mock('@/server/text', () => ({ extractText: vi.fn() }));
vi.mock('@/server/resume-parse/client', () => ({ completeResumeJson: vi.fn() }));
vi.mock('@/server/resume-parse/config', () => ({ resumeParserConfig: vi.fn() }));

import { db } from '@/lib/db';
import { openCandidateResume } from '@/server/candidate-resume-storage';
import { extractText } from '@/server/text';
import { completeResumeJson } from '@/server/resume-parse/client';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { processCandidateResumeJobs } from './candidate-resume-processing';

const profileId = 'candidate-profile-id';
const resumeText = [
  'Senior Product Engineer · Toronto, Canada',
  'Built a product platform using TypeScript.',
  'LinkedIn https://linkedin.com/in/rowan-test',
  'GitHub https://github.com/rowan-test',
].join('\n');

const transaction = {
  candidateProfile: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  candidateProfileFieldReview: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  candidateSkill: { findFirst: vi.fn(), create: vi.fn() },
  candidateExperience: { findFirst: vi.fn(), create: vi.fn() },
  candidateEducation: { findFirst: vi.fn(), create: vi.fn() },
  candidateProject: { findFirst: vi.fn(), create: vi.fn() },
  candidateCertification: { findFirst: vi.fn(), create: vi.fn() },
  candidateLanguage: { findFirst: vi.fn(), create: vi.fn() },
};

describe('candidate resume profile extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resumeParserConfig).mockReturnValue({
      state: 'on',
      maxChars: 20_000,
      providerLabel: 'Test model',
      model: 'test-model',
    } as never);
    vi.mocked(db.candidateResumeParseJob.findMany).mockResolvedValue([{
      id: 'parse-job-id',
      candidateAccountId: 'candidate-account-id',
      candidateResumeId: 'resume-id',
      attempts: 0,
      maxAttempts: 3,
    }] as never);
    vi.mocked(db.candidateResumeParseJob.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(db.candidateResumeParseJob.update).mockResolvedValue({} as never);
    vi.mocked(db.$transaction).mockImplementation(async (callback) => callback(transaction as never));
    transaction.candidateProfile.upsert.mockResolvedValue({
      id: profileId,
      headline: null,
      location: null,
      summary: null,
      linkedinUrl: null,
      githubUrl: null,
      websiteUrl: null,
      portfolioUrl: null,
    });
    transaction.candidateProfile.updateMany.mockResolvedValue({ count: 1 });
    transaction.candidateProfileFieldReview.findUnique.mockResolvedValue(null);
    transaction.candidateProfileFieldReview.upsert.mockResolvedValue({});
    transaction.candidateProfileFieldReview.create.mockResolvedValue({});
    for (const model of [
      transaction.candidateSkill,
      transaction.candidateExperience,
      transaction.candidateEducation,
      transaction.candidateProject,
      transaction.candidateCertification,
      transaction.candidateLanguage,
    ]) {
      model.findFirst.mockResolvedValue(null);
      model.create.mockImplementation(async ({ data }) => ({ id: `${data.name ?? data.title}-id` }));
    }
    vi.mocked(openCandidateResume).mockResolvedValue({
      body: new Blob(['resume file']).stream(),
    } as never);
    vi.mocked(extractText).mockResolvedValue({ status: 'OK', text: resumeText, version: 'test' } as never);
    vi.mocked(completeResumeJson).mockResolvedValue({
      raw: {
        name: 'Rowan Test',
        headline: 'Senior Product Engineer',
        location: 'Toronto, Canada',
        summary: 'Product engineer building platforms.',
        emails: [],
        phones: [],
        links: ['https://linkedin.com/in/rowan-test', 'https://github.com/rowan-test'],
        skills: ['TypeScript'],
        experience: [{
          title: 'Product Engineer',
          company: 'Acme',
          location: 'Toronto',
          start: '2021',
          end: 'present',
          description: 'Built a product platform.',
          responsibilities: 'Led product development.',
          achievements: 'Improved deployment time.',
        }],
        education: [{
          school: 'Toronto University',
          degree: 'BSc',
          field: 'Computer Science',
          start: '2017',
          end: '2021',
          location: 'Toronto',
          description: 'Computer science studies.',
          grade: 'Honours',
        }],
        projects: [{
          name: 'Hiring Platform',
          role: 'Creator',
          description: 'A platform for hiring teams.',
          technologies: ['TypeScript'],
          url: 'https://github.com/rowan-test',
          start: '2022',
          end: '2023',
        }],
        certifications: [{
          name: 'Cloud Engineer',
          issuer: 'Acme Academy',
          credentialId: 'AC-123',
          credentialUrl: null,
          issuedAt: '2023',
          expiresAt: null,
        }],
        languages: [{ name: 'English', proficiency: 'Fluent' }],
      },
    } as never);
  });

  it('saves extracted profile links and structured career sections for review', async () => {
    const result = await processCandidateResumeJobs(1);

    expect(result).toEqual({ state: 'on', processed: 1 });
    expect(transaction.candidateProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { linkedinUrl: 'https://linkedin.com/in/rowan-test' },
    }));
    expect(transaction.candidateExperience.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Product Engineer',
        responsibilities: 'Led product development.',
        achievements: 'Improved deployment time.',
      }),
    });
    expect(transaction.candidateEducation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ institution: 'Toronto University', gradeGpa: 'Honours' }),
    });
    expect(transaction.candidateProject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Hiring Platform', technologies: ['TypeScript'] }),
    });
    expect(transaction.candidateCertification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Cloud Engineer', credentialId: 'AC-123' }),
    });
    expect(transaction.candidateLanguage.create).toHaveBeenCalledWith({
      data: { candidateProfileId: profileId, name: 'English', proficiency: 'Fluent' },
    });
    expect(db.candidateResumeParseJob.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }));
  });
});
