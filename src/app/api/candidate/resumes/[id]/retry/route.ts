import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context) {
 if(!(await sameOriginRequest(request))) return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const account=await requireCandidateAccount(); const {id}=await context.params;
 const resume=await db.candidateResume.findFirst({where:{id,candidateAccountId:account.id,status:'STORED'},select:{id:true}});
 if(!resume) return NextResponse.json({error:'Resume not found.'},{status:404});
 const job=await db.candidateResumeParseJob.findFirst({where:{candidateResumeId:id,candidateAccountId:account.id},orderBy:{createdAt:'desc'}});
 if(!job) return NextResponse.json({error:'No extraction job exists.'},{status:404});
 if(['EXTRACTING','PARSING','QUEUED','UPLOADED'].includes(job.status)) return NextResponse.json({error:'Resume is already queued or processing.'},{status:409});
 if(job.attempts>=job.maxAttempts) return NextResponse.json({error:'Retry limit reached. Upload a new version to start a fresh extraction.'},{status:409});
 const updated=await db.candidateResumeParseJob.update({where:{id:job.id},data:{status:'QUEUED',availableAt:new Date(),completedAt:null,startedAt:null,errorCode:null,safeErrorMessage:null},select:{id:true,status:true}});
 return NextResponse.json({job:updated});
}
