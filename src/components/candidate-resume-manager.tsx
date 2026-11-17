'use client';
import { useRef,useState } from 'react';
type Resume={id:string;originalFilename:string;mimeType:string;sizeBytes:number;isPrimary:boolean;createdAt:string;parseJobs:{id:string;status:string;attempts:number;maxAttempts:number;safeErrorMessage:string|null}[]};
async function responseData(response:Response) {
 const contentType=response.headers.get('content-type')??'';
 if(!contentType.includes('application/json')) {
  if(response.status===401||response.redirected) throw new Error('Your candidate session has expired. Sign in again.');
  throw new Error(`The server returned an unexpected response (${response.status}). Please refresh and try again.`);
 }
 return response.json();
}
function statusText(status?:string){if(status==='COMPLETED')return'Extraction completed';if(status==='REVIEW_REQUIRED')return'Review your profile';if(status==='FAILED')return'Extraction failed';if(status==='EXTRACTING'||status==='PARSING'||status==='PROCESSING')return'Processing';return'Uploaded · waiting for extraction';}
export function CandidateResumeManager({initialResumes}:{initialResumes:Resume[]}) {
 const [resumes,setResumes]=useState(initialResumes);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const input=useRef<HTMLInputElement>(null);
 async function refresh(){const r=await fetch('/api/candidate/resumes',{cache:'no-store'});if(r.ok){const d=await responseData(r);setResumes(d.resumes);}}
 async function upload(file?:File){if(!file)return;setError('');setMessage('');if(!/\.(pdf|docx)$/i.test(file.name)){setError('Only PDF and DOCX files are supported.');return;}if(file.size>10*1024*1024){setError('Maximum file size is 10 MB.');return;}setBusy(true);try{const body=new FormData();body.append('file',file);const r=await fetch('/api/candidate/resumes',{method:'POST',body,credentials:'same-origin'});const d=await responseData(r);if(!r.ok)throw new Error(d.error||'Upload failed.');setMessage('Resume uploaded. Extraction will run in the background.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);if(input.current)input.current.value='';}}
 async function remove(id:string){if(!window.confirm('Delete this resume? This cannot be undone.'))return;setBusy(true);setError('');try{const r=await fetch('/api/candidate/resumes/'+encodeURIComponent(id),{method:'DELETE'});const d=await responseData(r);if(!r.ok)throw new Error(d.error||'Delete failed.');setResumes(rows=>rows.filter(x=>x.id!==id));setMessage('Resume deleted.');}catch(e){setError(e instanceof Error?e.message:'Delete failed.');}finally{setBusy(false);}}
 async function retry(id:string){setBusy(true);setError('');try{const r=await fetch('/api/candidate/resumes/'+encodeURIComponent(id)+'/retry',{method:'POST'});const d=await responseData(r);if(!r.ok)throw new Error(d.error||'Retry failed.');setMessage('Extraction queued for retry.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Retry failed.');}finally{setBusy(false);}}
 return <section className="space-y-5">
  <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files[0]);}} className="rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-10 text-center">
   <p className="text-sm font-medium text-ink">Drag and drop your resume here</p><p className="mt-2 text-xs text-ink-3">PDF or DOCX · Maximum 10 MB</p>
   <button type="button" disabled={busy} onClick={()=>input.current?.click()} className="mt-5 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy?'Please wait…':'Browse files'}</button>
   <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={e=>void upload(e.target.files?.[0])}/>
  </div>
  {message&&<p role="status" className="text-sm text-green-700">{message}</p>}{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  <div className="space-y-3">{resumes.length?resumes.map(resume=>{const job=resume.parseJobs[0];return <article key={resume.id} className="rounded-xl border border-line bg-surface p-4">
   <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-all text-sm font-medium text-ink">{resume.originalFilename}</p><p className="mt-1 text-xs text-ink-3">{(resume.sizeBytes/1048576).toFixed(2)} MB · {new Date(resume.createdAt).toLocaleDateString()}</p></div>{resume.isPrimary&&<span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">Current resume</span>}</div>
   <p className="mt-3 text-sm text-ink-2">{statusText(job?.status)}</p>{job?.safeErrorMessage&&<p className="mt-1 text-xs text-amber-700">{job.safeErrorMessage}</p>}
   <div className="mt-4 flex flex-wrap gap-3 text-sm"><a className="text-ink underline" href={'/api/candidate/resumes/'+encodeURIComponent(resume.id)}>Download</a>{job?.status==='FAILED'&&job.attempts<job.maxAttempts&&<button disabled={busy} onClick={()=>void retry(resume.id)} className="text-ink underline">Retry extraction</button>}<button disabled={busy} onClick={()=>void remove(resume.id)} className="text-red-600 underline">Delete</button></div>
  </article>; }):<p className="rounded-xl border border-dashed border-line p-6 text-sm text-ink-3">No resumes uploaded yet.</p>}</div>
 </section>;
}
