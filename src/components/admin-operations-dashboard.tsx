"use client";

import { AlertTriangle, ArrowRight, BriefcaseBusiness, Files, FolderPlus, Headphones, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type AdminOperationsData = {
  managerName: string;
  officeName: string;
  metrics: { pendingLeads: number; awaitingFiles: number; activeFiles: number; overdueFiles: number };
  candidates: { id: string; candidateNo: string; name: string; phone: string; passportNo: string | null; profession: string | null; preferredCountry: string | null; source: string | null; createdAt: string }[];
  officers: { id: string; name: string }[];
  countries: { country: string; count: number }[];
  stages: { stage: string; count: number }[];
  recentFiles: { id: string; fileNo: string; name: string; country: string; stage: string; status: string; owner: string; deadline: string | null }[];
};

const countryOptions = ["Saudi Arabia", "Dubai", "Oman", "Qatar", "Kuwait", "Bahrain", "Malaysia", "Romania"];
function countryHref(country: string) { const value=country.toLowerCase(); if(value.includes("saudi"))return "/module/ksa/passport-list"; if(value.includes("dubai")||value.includes("uae"))return "/module/dubai/passport-list"; return "/module/other-country/passport-list"; }

export function AdminOperationsDashboard({ data }: { data: AdminOperationsData }) {
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState<(typeof data.candidates)[number]|null>(null);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState<{kind:"ok"|"error";text:string}|null>(null);
  const [opened,setOpened]=useState<string[]>([]);
  const candidates=useMemo(()=>data.candidates.filter(candidate=>!opened.includes(candidate.id)&&`${candidate.candidateNo} ${candidate.name} ${candidate.phone} ${candidate.passportNo??""}`.toLowerCase().includes(query.toLowerCase())),[data.candidates,opened,query]);
  const cards=[
    {label:"Unconverted call leads",value:data.metrics.pendingLeads,icon:Headphones,tone:"blue",href:"/module/call-center/work-call-list"},
    {label:"Candidates awaiting file",value:Math.max(0,data.metrics.awaitingFiles-opened.length),icon:Users,tone:"violet",href:"#candidate-queue"},
    {label:"Active processing files",value:data.metrics.activeFiles,icon:Files,tone:"green",href:"/module/ksa/passport-list"},
    {label:"Overdue files",value:data.metrics.overdueFiles,icon:AlertTriangle,tone:"orange",href:"/module/ksa/passport-list"},
  ];
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selected)return;setSaving(true);setNotice(null);const form=new FormData(event.currentTarget);const body={candidateId:selected.id,country:String(form.get("country")||""),profession:String(form.get("profession")||""),company:String(form.get("company")||"")||undefined,agent:String(form.get("agent")||"")||undefined,assignedToId:String(form.get("assignedToId")||"")||undefined,deadline:String(form.get("deadline")||"")||undefined,verificationNote:String(form.get("verificationNote")||"")};try{const response=await fetch("/api/files",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const payload=await response.json();if(!response.ok)throw new Error(payload.error?.message||"Could not open the file.");setOpened(current=>[...current,selected.id]);setNotice({kind:"ok",text:`${payload.data.fileNo} created. Passport Entry is now ready.`});setSelected(null);router.refresh()}catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Could not open the file."})}finally{setSaving(false)}}
  return <div className="operations-dashboard">
    <div className="admin-page-head"><div><span>OFFICE OPERATIONS</span><h1>Welcome, {data.managerName}</h1><p>Convert approved candidates into country files, assign officers and monitor every live stage.</p></div><div className="admin-head-actions"><Link href="/module/call-center/officer-dashboard">Call center overview</Link><Link className="primary" href="/module/call-center/work-call-list">Review leads</Link></div></div>
    {notice&&<div className={`operations-notice ${notice.kind}`}>{notice.text}</div>}
    <section className="admin-kpis">{cards.map(card=><Link className="operations-kpi" href={card.href} key={card.label}><div className={card.tone}><card.icon size={20}/></div><span>{card.label}</span><strong>{card.value.toLocaleString()}</strong><small>Live office data</small></Link>)}</section>
    <section className="operations-pipeline admin-panel"><div className="admin-panel-head"><div><h2>Country pipeline</h2><p>All country groups use the same central candidate and processing-file relationship.</p></div></div><div>{data.countries.length?data.countries.map(item=><Link href={countryHref(item.country)} key={item.country}><span>{item.country}</span><strong>{item.count}</strong><ArrowRight size={16}/></Link>):<p className="operations-empty">No active country files yet.</p>}</div></section>
    <section className="operations-grid">
      <article className="admin-panel" id="candidate-queue"><div className="admin-panel-head"><div><h2>Candidates awaiting file opening</h2><p>Created by Call Center conversion or registration; Admin starts country processing.</p></div></div><label className="control-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search candidate, phone or passport"/></label><div className="admin-table-wrap operations-table"><table><thead><tr><th>Candidate</th><th>Preferred country</th><th>Profession</th><th>Source</th><th>Action</th></tr></thead><tbody>{candidates.map(candidate=><tr key={candidate.id}><td><b>{candidate.name}</b><small>{candidate.candidateNo} · {candidate.phone}</small></td><td>{candidate.preferredCountry??"Not selected"}</td><td>{candidate.profession??"Not selected"}</td><td>{candidate.source??"Direct"}</td><td><button onClick={()=>{setSelected(candidate);setNotice(null)}}><FolderPlus size={15}/> Open file</button></td></tr>)}{!candidates.length&&<tr><td colSpan={5}><div className="operations-empty">No candidates are waiting in this office.</div></td></tr>}</tbody></table></div></article>
      <aside className="admin-panel operations-workload"><div className="admin-panel-head"><div><h2>Stage workload</h2><p>Current active-file distribution.</p></div></div>{data.stages.map(item=><div key={item.stage}><span>{item.stage}</span><b>{item.count}</b></div>)}{!data.stages.length&&<p className="operations-empty">No active stages.</p>}</aside>
    </section>
    <section className="admin-panel operations-recent"><div className="admin-panel-head"><div><h2>Recently updated files</h2><p>Open any record to continue passport, medical, payment and visa work.</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>File</th><th>Candidate</th><th>Country</th><th>Current stage</th><th>Owner</th><th>Deadline</th></tr></thead><tbody>{data.recentFiles.map(file=><tr key={file.id}><td><Link href={`/file/${file.id}`}>{file.fileNo}</Link></td><td><b>{file.name}</b></td><td>{file.country}</td><td><i>{file.stage}</i></td><td>{file.owner}</td><td>{file.deadline??"Not set"}</td></tr>)}</tbody></table></div></section>
    {selected&&<div className="operations-modal" role="dialog" aria-modal="true" aria-label="Open processing file"><button className="operations-modal-backdrop" onClick={()=>setSelected(null)} aria-label="Close"/><form onSubmit={submit}><header><div><span>OPEN COUNTRY FILE</span><h2>{selected.name}</h2><p>{selected.candidateNo} · {selected.phone}</p></div><button type="button" onClick={()=>setSelected(null)}>×</button></header><div className="operations-form"><label>Country *<select name="country" defaultValue={selected.preferredCountry??""} required><option value="">Select country</option>{countryOptions.map(country=><option key={country}>{country}</option>)}</select></label><label>Assigned officer<select name="assignedToId" defaultValue=""><option value="">Assign to me</option>{data.officers.map(officer=><option value={officer.id} key={officer.id}>{officer.name}</option>)}</select></label><label>Profession *<input name="profession" defaultValue={selected.profession??""} required/></label><label>Company<input name="company" placeholder="Employer / company"/></label><label>Agent<input name="agent" placeholder="Agent or direct"/></label><label>Deadline<input name="deadline" type="date"/></label><label className="wide">Opening note *<textarea name="verificationNote" defaultValue="Candidate approved; country processing file opened by Admin." minLength={3} required/></label></div><footer><button type="button" onClick={()=>setSelected(null)}>Cancel</button><button className="primary" disabled={saving}><BriefcaseBusiness size={16}/>{saving?"Opening…":"Open processing file"}</button></footer></form></div>}
  </div>;
}
