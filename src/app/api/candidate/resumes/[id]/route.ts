import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
import { deleteCandidateResume,openCandidateResume,CandidateResumeMissingError } from '@/server/candidate-resume-storage';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context) {
 const account=await requireCandidateAccount(); const {id}=await context.params;
 try { const opened=await openCandidateResume(account.id,id); const filename=encodeURIComponent(opened.resume.originalFilename);
  return new Response(opened.body,{headers:{'Content-Type':opened.resume.mimeType,'Content-Length':String(opened.resume.sizeBytes),'Content-Disposition':"attachment; filename=\"resume\"; filename*=UTF-8''"+filename,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 } catch(error) { if(error instanceof CandidateResumeMissingError) return NextResponse.json({error:'Resume not found.'},{status:404}); return NextResponse.json({error:'Unable to download this resume.'},{status:500}); }
}
export async function DELETE(request:Request,context:Context) {
 if(!(await sameOriginRequest(request))) return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const account=await requireCandidateAccount(); const {id}=await context.params;
 try { const resume=await db.candidateResume.findFirst({where:{id,candidateAccountId:account.id},select:{id:true,isPrimary:true}}); if(!resume) return NextResponse.json({error:'Resume not found.'},{status:404});
  await deleteCandidateResume(account.id,id);
  if(resume.isPrimary) { const next=await db.candidateResume.findFirst({where:{candidateAccountId:account.id,status:'STORED'},orderBy:{createdAt:'desc'},select:{id:true}}); if(next) await db.candidateResume.updateMany({where:{id:next.id,candidateAccountId:account.id},data:{isPrimary:true}}); }
  return NextResponse.json({ok:true});
 } catch { return NextResponse.json({error:'Unable to delete this resume. Please retry.'},{status:500}); }
}
