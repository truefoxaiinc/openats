import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCandidateAccount } from '@/server/candidate-auth/guards';
import { sameOriginRequest } from '@/server/candidate-auth/validation';
const fields=['headline','summary','location','city','country','address','linkedinUrl','githubUrl','websiteUrl','portfolioUrl'] as const;
function clean(v:unknown,max:number):string|null|undefined { if(v===undefined)return undefined; if(v===null||v==='')return null; if(typeof v!=='string')return undefined; const s=v.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g,' ').trim(); return s?s.slice(0,max):null; }
function validUrl(v:string|null|undefined) { if(!v)return true; try {const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;} }
export async function GET() { const account=await requireCandidateAccount(); const profile=await db.candidateProfile.findUnique({where:{candidateAccountId:account.id},include:{skills:true,experience:{orderBy:{startDate:'desc'}},education:{orderBy:{startDate:'desc'}},certifications:true,projects:true,languages:true,additionalInformation:true}}); return NextResponse.json({profile}); }
export async function PUT(request:Request) {
 if(!(await sameOriginRequest(request)))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const account=await requireCandidateAccount(); let body:Record<string,unknown>; try{body=await request.json();}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400});}
 const data:Record<string,string|null>={}; for(const field of fields){const value=clean(body[field],field==='summary'?1200:200);if(value!==undefined)data[field]=value;}
 for(const field of ['linkedinUrl','githubUrl','websiteUrl','portfolioUrl'] as const)if(!validUrl(data[field]))return NextResponse.json({error:'Professional links must be valid HTTPS URLs.'},{status:400});
 const profile=await db.$transaction(async tx=>{
  const saved=await tx.candidateProfile.upsert({where:{candidateAccountId:account.id},create:{candidateAccountId:account.id,...data},update:data});
  for(const fieldKey of Object.keys(data)){const key={candidateProfileId:saved.id,entityType:'PROFILE',entityId:saved.id,fieldKey};await tx.candidateProfileFieldReview.upsert({where:{candidateProfileId_entityType_entityId_fieldKey:key},create:{...key,candidateAccountId:account.id,dataSource:'CANDIDATE_EDITED',reviewStatus:'CONFIRMED',confirmedAt:new Date()},update:{dataSource:'CANDIDATE_EDITED',reviewStatus:'CONFIRMED',confirmedAt:new Date()}});}
  return saved;
 },{isolationLevel:'Serializable'});
 return NextResponse.json({profile});
}
