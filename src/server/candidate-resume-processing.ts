import { db } from '@/lib/db';
import { openCandidateResume } from '@/server/candidate-resume-storage';
import { extractText } from '@/server/text';
import { completeResumeJson } from '@/server/resume-parse/client';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { sanitizeResumeText } from '@/server/resume-parse/prompt';
import { normalizeDate,validateParsedResume } from '@/server/resume-parse/validate';
const SAFE={empty:'No readable text was found. Upload a text-based PDF or DOCX.',read:'The resume could not be read. Try another PDF or DOCX file.',provider:'Automatic extraction is temporarily unavailable. Please try again later.'};
function asDate(value:string|null,end=false):Date|null { const date=normalizeDate(value,{end}); if(!date||date==='present') return null; return new Date(/^\d{4}$/.test(date)?date+'-01-01T00:00:00.000Z':date+'-01T00:00:00.000Z'); }
async function persist(accountId:string,resumeId:string,parsed:ReturnType<typeof validateParsedResume>['profile']) {
 return db.$transaction(async tx=>{
  const profile=await tx.candidateProfile.upsert({where:{candidateAccountId:accountId},create:{candidateAccountId:accountId},update:{},select:{id:true,headline:true,location:true,summary:true}});
  let count=0;
  for(const [fieldKey,value] of [['headline',parsed.headline],['location',parsed.location],['summary',parsed.summary]] as const) {
   if(!value||profile[fieldKey]) continue;
   const key={candidateProfileId:profile.id,entityType:'PROFILE',entityId:profile.id,fieldKey};
   const review=await tx.candidateProfileFieldReview.findUnique({where:{candidateProfileId_entityType_entityId_fieldKey:key},select:{reviewStatus:true}});
   if(review?.reviewStatus==='CONFIRMED') continue;
   const changed=await tx.candidateProfile.updateMany({where:{id:profile.id,candidateAccountId:accountId,[fieldKey]:null},data:{[fieldKey]:value}});
   if(!changed.count) continue;
   await tx.candidateProfileFieldReview.upsert({where:{candidateProfileId_entityType_entityId_fieldKey:key},create:{...key,candidateAccountId:accountId,dataSource:'AI_EXTRACTED',reviewStatus:'PENDING',sourceResumeId:resumeId},update:{dataSource:'AI_EXTRACTED',reviewStatus:'PENDING',sourceResumeId:resumeId}});
   count++;
  }
  for(const name of parsed.skills) {
   const exists=await tx.candidateSkill.findFirst({where:{candidateProfileId:profile.id,name:{equals:name,mode:'insensitive'}},select:{id:true}});
   if(exists) continue;
   const row=await tx.candidateSkill.create({data:{candidateProfileId:profile.id,name}});
   await tx.candidateProfileFieldReview.create({data:{candidateAccountId:accountId,candidateProfileId:profile.id,entityType:'SKILL',entityId:row.id,fieldKey:'name',dataSource:'AI_EXTRACTED',reviewStatus:'PENDING',sourceResumeId:resumeId}}); count++;
  }
  for(const item of parsed.experience) {
   if(!item.company||!item.title) continue;
   const startDate=asDate(item.start),endDate=asDate(item.end,true);
   const exists=await tx.candidateExperience.findFirst({where:{candidateProfileId:profile.id,company:item.company,title:item.title,startDate},select:{id:true}});
   if(exists) continue;
   const row=await tx.candidateExperience.create({data:{candidateProfileId:profile.id,company:item.company,title:item.title,location:item.location,startDate,endDate,isCurrent:item.end?.toLowerCase()==='present'}});
   await tx.candidateProfileFieldReview.create({data:{candidateAccountId:accountId,candidateProfileId:profile.id,entityType:'EXPERIENCE',entityId:row.id,fieldKey:'*',dataSource:'AI_EXTRACTED',reviewStatus:'PENDING',sourceResumeId:resumeId}}); count++;
  }
  for(const item of parsed.education) {
   if(!item.school) continue;
   const startDate=asDate(item.start),endDate=asDate(item.end,true);
   const exists=await tx.candidateEducation.findFirst({where:{candidateProfileId:profile.id,institution:item.school,degree:item.degree,startDate},select:{id:true}});
   if(exists) continue;
   const row=await tx.candidateEducation.create({data:{candidateProfileId:profile.id,institution:item.school,degree:item.degree,fieldOfStudy:item.field,startDate,endDate}});
   await tx.candidateProfileFieldReview.create({data:{candidateAccountId:accountId,candidateProfileId:profile.id,entityType:'EDUCATION',entityId:row.id,fieldKey:'*',dataSource:'AI_EXTRACTED',reviewStatus:'PENDING',sourceResumeId:resumeId}}); count++;
  }
  return count;
 },{isolationLevel:'Serializable'});
}
export async function processCandidateResumeJobs(limit=5) {
 const config=resumeParserConfig(); if(config.state!=='on') return {state:config.state,processed:0};
 const jobs=await db.candidateResumeParseJob.findMany({where:{status:{in:['UPLOADED','QUEUED','FAILED']},availableAt:{lte:new Date()},attempts:{lt:3}},orderBy:{createdAt:'asc'},take:Math.max(1,Math.min(limit,10)),select:{id:true,candidateAccountId:true,candidateResumeId:true,attempts:true,maxAttempts:true}});
 let processed=0;
 for(const job of jobs) {
  const claimed=await db.candidateResumeParseJob.updateMany({where:{id:job.id,status:{in:['UPLOADED','QUEUED','FAILED']},attempts:{lt:3}},data:{status:'EXTRACTING',attempts:{increment:1},lastAttemptAt:new Date(),startedAt:new Date(),errorCode:null,safeErrorMessage:null}});
  if(!claimed.count) continue; processed++;
  try {
   const opened=await openCandidateResume(job.candidateAccountId,job.candidateResumeId);
   const bytes=new Uint8Array(await new Response(opened.body).arrayBuffer());
   const extracted=await extractText({data:bytes,source:'apply',fileId:job.candidateResumeId});
   if(extracted.status!=='OK'||!extracted.text) { const empty=extracted.status==='EMPTY'; await db.candidateResumeParseJob.update({where:{id:job.id},data:{status:'FAILED',errorCode:empty?'text_empty':'text_extraction_failed',safeErrorMessage:empty?SAFE.empty:SAFE.read,completedAt:new Date()}}); continue; }
   await db.candidateResumeParseJob.update({where:{id:job.id},data:{status:'PARSING'}});
   const result=await completeResumeJson(config,sanitizeResumeText(extracted.text,config.maxChars));
   const parsed=validateParsedResume(result.raw,extracted.text);
   const count=await persist(job.candidateAccountId,job.candidateResumeId,parsed.profile);
   await db.candidateResumeParseJob.update({where:{id:job.id},data:{status:count?'COMPLETED':'REVIEW_REQUIRED',completedAt:new Date(),safeErrorMessage:count?null:'Resume stored. Review your profile and add missing information.',extractionMetadata:{extractorVersion:extracted.version,textCharacters:extracted.text.length,fieldsSaved:count,provider:config.providerLabel,model:config.model}}});
  } catch(error) {
   const code=error&&typeof error==='object'&&'code'in error&&typeof error.code==='string'?error.code:'provider_failed'; const attempt=job.attempts+1; const failed=attempt>=job.maxAttempts;
   await db.candidateResumeParseJob.update({where:{id:job.id},data:{status:failed?'FAILED':'QUEUED',availableAt:new Date(Date.now()+Math.min(60,5*attempt)*60000),errorCode:code.slice(0,64),safeErrorMessage:SAFE.provider,completedAt:failed?new Date():null}});
   console.warn('[candidate-resume-parse] job failed',{jobId:job.id,code:code.slice(0,64),attempt});
  }
 }
 return {state:'on',processed};
}
