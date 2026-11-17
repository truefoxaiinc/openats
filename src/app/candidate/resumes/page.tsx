import type { Metadata } from 'next';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { db } from '@/lib/db';
import { CandidateResumeManager } from '@/components/candidate-resume-manager';
export const metadata:Metadata={title:'My resumes | OpenATS',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function CandidateResumesPage(){
 const account=await requireCandidateAccount();
 const resumes=await db.candidateResume.findMany({where:{candidateAccountId:account.id},orderBy:{createdAt:'desc'},select:{id:true,originalFilename:true,mimeType:true,sizeBytes:true,isPrimary:true,createdAt:true,parseJobs:{orderBy:{createdAt:'desc'},take:1,select:{id:true,status:true,attempts:true,maxAttempts:true,safeErrorMessage:true}}}});
 return <main className="w-full max-w-4xl"><header className="mb-8"><a href="/candidate/dashboard" className="text-sm text-ink-2">← Candidate dashboard</a><h1 className="mt-3 text-2xl font-semibold text-ink">My resumes</h1><p className="mt-2 text-sm text-ink-2">Upload a PDF or DOCX. Your files are private and visible only to your candidate account.</p></header><CandidateResumeManager initialResumes={resumes.map(r=>({...r,createdAt:r.createdAt.toISOString(),parseJobs:r.parseJobs.map(j=>({...j}))}))}/></main>;
}
