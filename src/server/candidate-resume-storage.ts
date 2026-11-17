import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { AwsClient } from 'aws4fetch';
import { db } from '@/lib/db';
import { sniffFormat } from '@/server/text/sniff';

export const MAX_CANDIDATE_RESUME_BYTES = 10 * 1024 * 1024;
const MIME_BY_FORMAT = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain',
} as const;
type ResumeFormat = keyof typeof MIME_BY_FORMAT;
const LOCAL_ROOT = path.resolve(process.env.CANDIDATE_STORAGE_LOCAL_ROOT || path.join(process.cwd(), '.data'));

type CandidateS3Config = { endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string };
function s3Config(): CandidateS3Config | null {
  const { CANDIDATE_S3_ENDPOINT, CANDIDATE_S3_BUCKET, CANDIDATE_S3_ACCESS_KEY_ID, CANDIDATE_S3_SECRET_ACCESS_KEY } = process.env;
  if (!CANDIDATE_S3_ENDPOINT || !CANDIDATE_S3_BUCKET || !CANDIDATE_S3_ACCESS_KEY_ID || !CANDIDATE_S3_SECRET_ACCESS_KEY) return null;
  return { endpoint: CANDIDATE_S3_ENDPOINT.replace(/\/+$/, ''), bucket: CANDIDATE_S3_BUCKET, region: process.env.CANDIDATE_S3_REGION || 'auto', accessKeyId: CANDIDATE_S3_ACCESS_KEY_ID, secretAccessKey: CANDIDATE_S3_SECRET_ACCESS_KEY };
}
function driver(): 'local' | 's3' {
  const configured = process.env.CANDIDATE_STORAGE_DRIVER;
  if (configured === 's3') {
    const cfg = s3Config();
    if (!cfg) throw new Error('Candidate S3 storage is missing required credentials.');
    if (process.env.NODE_ENV === 'production' && !cfg.endpoint.startsWith('https://')) throw new Error('Production candidate S3 storage requires HTTPS.');
    return 's3';
  }
  if (configured && configured !== 'local') throw new Error('CANDIDATE_STORAGE_DRIVER must be local or s3.');
  if (process.env.NODE_ENV === 'production') throw new Error('Production candidate resumes require explicit private S3 storage configuration.');
  return 'local';
}
let s3Client: { key: string; client: AwsClient } | undefined;
function client(cfg: CandidateS3Config): AwsClient {
  const key = [cfg.endpoint, cfg.accessKeyId, cfg.region].join('|');
  if (!s3Client || s3Client.key !== key) s3Client = { key, client: new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: 's3', region: cfg.region }) };
  return s3Client.client;
}
function objectUrl(cfg: CandidateS3Config, key: string): string {
  return cfg.endpoint + '/' + encodeURIComponent(cfg.bucket) + '/' + key.split('/').map(encodeURIComponent).join('/');
}
function safeKey(candidateAccountId: string, key: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(candidateAccountId) || !key.startsWith('candidate-resumes/' + candidateAccountId + '/') || key.includes('..') || key.includes('\\')) throw new Error('Invalid candidate storage key.');
  return key;
}
export function createCandidateResumeStorageKey(candidateAccountId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(candidateAccountId)) throw new Error('Invalid candidate account identifier.');
  return 'candidate-resumes/' + candidateAccountId + '/' + randomUUID();
}
export function sanitizeCandidateFilename(filename: string): string {
  const base = path.basename(filename.replace(/\\/g, '/')).normalize('NFKC').replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120);
  return base && base !== '.' && base !== '..' ? base : 'resume';
}
export function validateCandidateResume(data: Uint8Array, declaredMime: string) {
  if (data.byteLength === 0) throw new Error('Resume file is empty.');
  if (data.byteLength > MAX_CANDIDATE_RESUME_BYTES) throw new Error('Resume file exceeds the 10 MB limit.');
  const sniffed = sniffFormat(data);
  if (!sniffed.format || !(sniffed.format in MIME_BY_FORMAT)) throw new Error('Unsupported or invalid resume file signature.');
  const format = sniffed.format as ResumeFormat;
  const expectedMime = MIME_BY_FORMAT[format];
  const normalizedMime = declaredMime.toLowerCase().split(';')[0].trim();
  if (normalizedMime !== expectedMime && normalizedMime !== 'application/octet-stream') throw new Error('The declared file type does not match its content.');
  return { format, mimeType: expectedMime, sha256: createHash('sha256').update(data).digest('hex') };
}
async function put(key: string, data: Uint8Array, mime: string) {
  if (driver() === 's3') {
    const cfg = s3Config()!;
    const response = await client(cfg).fetch(objectUrl(cfg, key), { method: 'PUT', body: new Uint8Array(data), headers: { 'content-type': mime } });
    if (!response.ok) throw new Error('Private candidate storage upload failed (HTTP ' + response.status + ').');
    return;
  }
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid candidate storage path.');
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const handle = await open(target, 'wx', 0o600);
  try { await handle.writeFile(data); } finally { await handle.close(); }
}
async function remove(key: string) {
  if (driver() === 's3') {
    const cfg = s3Config()!;
    const response = await client(cfg).fetch(objectUrl(cfg, key), { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error('Private candidate storage delete failed (HTTP ' + response.status + ').');
    return;
  }
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid candidate storage path.');
  await unlink(target).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
}
export class CandidateResumeMissingError extends Error {}
export async function storeCandidateResume(input: { candidateAccountId: string; filename: string; declaredMime: string; data: Uint8Array; isPrimary?: boolean }) {
  const metadata = validateCandidateResume(input.data, input.declaredMime);
  const storageKey = createCandidateResumeStorageKey(input.candidateAccountId);
  const originalFilename = sanitizeCandidateFilename(input.filename);
  await put(storageKey, input.data, metadata.mimeType);
  try {
    return await db.$transaction(async tx => {
      if (input.isPrimary) await tx.candidateResume.updateMany({ where: { candidateAccountId: input.candidateAccountId, isPrimary: true }, data: { isPrimary: false } });
      const saved = await tx.candidateResume.create({ data: { candidateAccountId: input.candidateAccountId, storageKey, originalFilename, mimeType: metadata.mimeType, sizeBytes: input.data.byteLength, sha256: metadata.sha256, isPrimary: Boolean(input.isPrimary) } });
      return { id: saved.id, originalFilename: saved.originalFilename, mimeType: saved.mimeType, sizeBytes: saved.sizeBytes, sha256: saved.sha256, isPrimary: saved.isPrimary, createdAt: saved.createdAt };
    });
  } catch (error) {
    await remove(storageKey).catch(() => undefined);
    throw error;
  }
}
export async function openCandidateResume(candidateAccountId: string, resumeId: string): Promise<{ body: ReadableStream<Uint8Array>; resume: { id: string; originalFilename: string; mimeType: string; sizeBytes: number } }> {
  const resume = await db.candidateResume.findFirst({ where: { id: resumeId, candidateAccountId, status: 'STORED' }, select: { id: true, candidateAccountId: true, storageKey: true, originalFilename: true, mimeType: true, sizeBytes: true } });
  if (!resume) throw new CandidateResumeMissingError('Candidate resume not found.');
  const key = safeKey(candidateAccountId, resume.storageKey);
  if (driver() === 's3') {
    const cfg = s3Config()!;
    const response = await client(cfg).fetch(objectUrl(cfg, key));
    if (response.status === 404) throw new CandidateResumeMissingError('Candidate resume not found.');
    if (!response.ok || !response.body) throw new Error('Private candidate storage is temporarily unavailable.');
    return { body: response.body, resume: { id: resume.id, originalFilename: resume.originalFilename, mimeType: resume.mimeType, sizeBytes: resume.sizeBytes } };
  }
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) throw new Error('Invalid candidate storage path.');
  await access(target).catch(() => { throw new CandidateResumeMissingError('Candidate resume not found.'); });
  return { body: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>, resume: { id: resume.id, originalFilename: resume.originalFilename, mimeType: resume.mimeType, sizeBytes: resume.sizeBytes } };
}
export async function deleteCandidateResume(candidateAccountId: string, resumeId: string): Promise<void> {
  const resume = await db.candidateResume.findFirst({ where: { id: resumeId, candidateAccountId }, select: { id: true, storageKey: true } });
  if (!resume) throw new CandidateResumeMissingError('Candidate resume not found.');
  const key = safeKey(candidateAccountId, resume.storageKey);
  await db.candidateResume.updateMany({ where: { id: resumeId, candidateAccountId }, data: { status: 'DELETE_PENDING' } });
  await remove(key);
  await db.candidateResume.deleteMany({ where: { id: resumeId, candidateAccountId, status: 'DELETE_PENDING' } });
}
