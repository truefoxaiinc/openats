import { db } from '@/lib/db';
import { openCandidateResume } from '@/server/candidate-resume-storage';
import { extractText } from '@/server/text';
import { completeResumeJson } from '@/server/resume-parse/client';
import { resumeParserConfig } from '@/server/resume-parse/config';
import { sanitizeResumeText } from '@/server/resume-parse/prompt';
import { normalizeDate,validateParsedResume } from '@/server/resume-parse/validate';
const SAFE={empty:'No readable text was found. Upload a text-based PDF or DOCX.',read:'The resume could not be read. Try another PDF or DOCX file.',provider:'Automatic extraction is temporarily unavailable. Please try again later.'};
function asDate(value:string|null,end=false):Date|null { const date=normalizeDate(value,{end}); if(!date||date==='present') return null; return new Date(/^\d{4}$/.test(date)?date+'-01-01T00:00:00.000Z':date+'-01T00:00:00.000Z'); }
async function persist(accountId: string, resumeId: string, parsed: ReturnType<typeof validateParsedResume>['profile']) {
  return db.$transaction(async (tx) => {
    const profile = await tx.candidateProfile.upsert({
      where: { candidateAccountId: accountId },
      create: { candidateAccountId: accountId },
      update: {},
      select: {
        id: true,
        headline: true,
        location: true,
        summary: true,
        linkedinUrl: true,
        githubUrl: true,
        websiteUrl: true,
        portfolioUrl: true,
      },
    });
    let count = 0;
    const profileLinks = [
      ['linkedinUrl', parsed.links.find((url) => url.toLowerCase().includes('linkedin.com'))],
      ['githubUrl', parsed.links.find((url) => url.toLowerCase().includes('github.com'))],
      ['portfolioUrl', parsed.links.find((url) => /portfolio|behance\.net|dribbble\.com/i.test(url))],
      ['websiteUrl', parsed.links.find((url) => !/linkedin\.com|github\.com|portfolio|behance\.net|dribbble\.com/i.test(url))],
    ] as const;
    const profileFields = [
      ['headline', parsed.headline],
      ['location', parsed.location],
      ['summary', parsed.summary],
      ...profileLinks,
    ] as const;
    for (const [fieldKey, value] of profileFields) {
      if (!value || profile[fieldKey]) continue;
      const key = { candidateProfileId: profile.id, entityType: 'PROFILE', entityId: profile.id, fieldKey };
      const review = await tx.candidateProfileFieldReview.findUnique({
        where: { candidateProfileId_entityType_entityId_fieldKey: key },
        select: { reviewStatus: true },
      });
      if (review?.reviewStatus === 'CONFIRMED') continue;
      const changed = await tx.candidateProfile.updateMany({
        where: { id: profile.id, candidateAccountId: accountId, [fieldKey]: null },
        data: { [fieldKey]: value },
      });
      if (!changed.count) continue;
      await tx.candidateProfileFieldReview.upsert({
        where: { candidateProfileId_entityType_entityId_fieldKey: key },
        create: { ...key, candidateAccountId: accountId, dataSource: 'AI_EXTRACTED', reviewStatus: 'PENDING', sourceResumeId: resumeId },
        update: { dataSource: 'AI_EXTRACTED', reviewStatus: 'PENDING', sourceResumeId: resumeId },
      });
      count++;
    }

    async function addReview(entityType: string, entityId: string, fieldKey = '*') {
      await tx.candidateProfileFieldReview.create({
        data: { candidateAccountId: accountId, candidateProfileId: profile.id, entityType, entityId, fieldKey, dataSource: 'AI_EXTRACTED', reviewStatus: 'PENDING', sourceResumeId: resumeId },
      });
    }

    for (const name of parsed.skills) {
      const exists = await tx.candidateSkill.findFirst({
        where: { candidateProfileId: profile.id, name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateSkill.create({ data: { candidateProfileId: profile.id, name } });
      await addReview('SKILL', row.id, 'name');
      count++;
    }
    for (const item of parsed.experience) {
      if (!item.company || !item.title) continue;
      const startDate = asDate(item.start);
      const endDate = asDate(item.end, true);
      const exists = await tx.candidateExperience.findFirst({
        where: { candidateProfileId: profile.id, company: item.company, title: item.title, startDate },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateExperience.create({
        data: {
          candidateProfileId: profile.id,
          company: item.company,
          title: item.title,
          location: item.location,
          startDate,
          endDate,
          isCurrent: item.end?.toLowerCase() === 'present',
          description: item.description,
          responsibilities: item.responsibilities,
          achievements: item.achievements,
        },
      });
      await addReview('EXPERIENCE', row.id);
      count++;
    }
    for (const item of parsed.education) {
      if (!item.school) continue;
      const startDate = asDate(item.start);
      const endDate = asDate(item.end, true);
      const exists = await tx.candidateEducation.findFirst({
        where: { candidateProfileId: profile.id, institution: item.school, degree: item.degree, startDate },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateEducation.create({
        data: {
          candidateProfileId: profile.id,
          institution: item.school,
          degree: item.degree,
          fieldOfStudy: item.field,
          location: item.location,
          startDate,
          endDate,
          description: item.description,
          gradeGpa: item.grade,
        },
      });
      await addReview('EDUCATION', row.id);
      count++;
    }
    for (const item of parsed.projects) {
      if (!item.name) continue;
      const startDate = asDate(item.start);
      const exists = await tx.candidateProject.findFirst({
        where: { candidateProfileId: profile.id, name: item.name, role: item.role },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateProject.create({
        data: {
          candidateProfileId: profile.id,
          name: item.name,
          role: item.role,
          description: item.description,
          technologies: item.technologies,
          url: item.url,
          startDate,
          endDate: asDate(item.end, true),
        },
      });
      await addReview('PROJECT', row.id);
      count++;
    }
    for (const item of parsed.certifications) {
      if (!item.name) continue;
      const exists = await tx.candidateCertification.findFirst({
        where: { candidateProfileId: profile.id, name: item.name, issuer: item.issuer },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateCertification.create({
        data: {
          candidateProfileId: profile.id,
          name: item.name,
          issuer: item.issuer,
          credentialId: item.credentialId,
          credentialUrl: item.credentialUrl,
          issuedAt: asDate(item.issuedAt),
          expiresAt: asDate(item.expiresAt, true),
        },
      });
      await addReview('CERTIFICATION', row.id);
      count++;
    }
    for (const item of parsed.languages) {
      if (!item.name) continue;
      const exists = await tx.candidateLanguage.findFirst({
        where: { candidateProfileId: profile.id, name: { equals: item.name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists) continue;
      const row = await tx.candidateLanguage.create({
        data: { candidateProfileId: profile.id, name: item.name, proficiency: item.proficiency },
      });
      await addReview('LANGUAGE', row.id);
      count++;
    }
    return count;
  }, { isolationLevel: 'Serializable' });
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
