import { after, NextResponse } from 'next/server';
import { processCandidateResumeJobs } from '@/server/candidate-resume-processing';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { storeCandidateResume, deleteCandidateResume, validateCandidateResume, MAX_CANDIDATE_RESUME_BYTES } from '@/server/candidate-resume-storage';
export const runtime = 'nodejs';
export async function GET() {
 const account=await requireCandidateAccount();
 const resumes=await db.candidateResume.findMany({where:{candidateAccountId:account.id},orderBy:{createdAt:'desc'},select:{id:true,originalFilename:true,mimeType:true,sizeBytes:true,isPrimary:true,status:true,createdAt:true,parseJobs:{orderBy:{createdAt:'desc'},take:1,select:{id:true,status:true,attempts:true,maxAttempts:true,errorCode:true,safeErrorMessage:true,completedAt:true}}}});
 return NextResponse.json({resumes});
}
export async function POST(request:Request) {
 if(!(await sameOriginRequest(request))) return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const account=await requireCandidateAccount();
 try {
  const form=await request.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'Choose a PDF or DOCX resume.'},{status:400});
  if(file.size<1||file.size>MAX_CANDIDATE_RESUME_BYTES) return NextResponse.json({error:'Resume must be smaller than 10 MB.'},{status:413});
  const bytes=new Uint8Array(await file.arrayBuffer()); const checked=validateCandidateResume(bytes,file.type||'application/octet-stream');
  if(checked.format!=='pdf'&&checked.format!=='docx') return NextResponse.json({error:'Only PDF and DOCX resumes are supported.'},{status:415});
  const resume=await storeCandidateResume({candidateAccountId:account.id,filename:file.name,declaredMime:file.type||'application/octet-stream',data:bytes,isPrimary:true});
  try { const job=await db.candidateResumeParseJob.create({data:{candidateAccountId:account.id,candidateResumeId:resume.id,status:'UPLOADED',availableAt:new Date()},select:{id:true,status:true}}); const parser=resumeParserConfig(); if(parser.state==='on') after(() => processCandidateResumeJobs(1).catch(() => console.error('[candidate-resume] background extraction failed'))); return NextResponse.json({resume,job,extractionConfigured:parser.state==='on',parserState:parser.state==='misconfigured'?parser.reason:parser.state},{status:201}); }
  catch(error) { await deleteCandidateResume(account.id,resume.id).catch(() => undefined); throw error; }
 } catch(error) {
  const message=error instanceof Error?error.message:'';
  if(/unsupported|signature|declared file type|empty|10 MB/i.test(message)) return NextResponse.json({error:message},{status:400});
  console.error('[candidate-resume] upload failed',{candidateAccountId:account.id,name:error instanceof Error?error.name:'Error'});
  return NextResponse.json({error:'Unable to store this resume. Please try again.'},{status:500});
 }
}
