import { useState, useRef, useEffect } from "react";

const PRIORITIES = [
  { id:1, label:"Customer Engagements",   short:"CE", color:"#2563EB", bg:"#EFF6FF", light:"#DBEAFE" },
  { id:2, label:"Product Strategy",       short:"PS", color:"#7C3AED", bg:"#F5F3FF", light:"#EDE9FE" },
  { id:3, label:"CDS",                    short:"CD", color:"#0891B2", bg:"#ECFEFF", light:"#CFFAFE" },
  { id:4, label:"AI Native",              short:"AI", color:"#059669", bg:"#ECFDF5", light:"#D1FAE5" },
  { id:5, label:"Product Discovery",      short:"PD", color:"#D97706", bg:"#FFFBEB", light:"#FEF3C7" },
  { id:6, label:"Product Value Delivery", short:"PV", color:"#DC2626", bg:"#FEF2F2", light:"#FEE2E2" },
];
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_S     = ["M","T","W","T","F","S","S"];
const DAYS       = ["Mon","Tue","Wed","Thu","Fri"];
const HOURS      = Array.from({length:13},(_,i)=>i+7);
const YEAR       = 2026;
const QUARTERS   = ["Q1","Q2","Q3","Q4"];
const Q_MONTHS   = {Q1:[0,1,2],Q2:[3,4,5],Q3:[6,7,8],Q4:[9,10,11]};
const WEEK_DATES = ["May 4","May 11","May 18","May 25","Jun 1"];
const NAV        = ["Annual","Quarterly","Weekly Merge","Timetable","Retro"];
const ICONS      = ["◈","⊞","⇄","⏱","✦"];
const DAY_W      = 38;
const CELL_H     = 26;
const COL_W      = 120;

const gp = id => PRIORITIES.find(p=>p.id===id);

const getWeekLabel = (year,month,day) => {
  const d=new Date(year,month,day), dow=d.getDay();
  const diff=dow===0?-6:1-dow;
  const mon=new Date(d); mon.setDate(d.getDate()+diff);
  return `${MONTHS[mon.getMonth()]} ${mon.getDate()}`;
};

// ── Storage ──────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.REACT_APP_SUPAURL || "https://ggfqzxafrkicekfulceo.supabase.co";
const SUPA_KEY = process.env.REACT_APP_SUPAKEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnF6eGFmcmtpY2VrZnVsY2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzA5MDksImV4cCI6MjA5MzMwNjkwOX0.gSIxrR40RSooK53WrNmPZRBcoF2EKCqwvXbaEOKNlVM";
const TABLE    = "mihir_planner";
const SH = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Prefer":"resolution=merge-duplicates"};

const lsGet = (k,fb) => { try { const v=localStorage.getItem("mp_"+k); return v?JSON.parse(v):fb; } catch { return fb; } };
const lsSet = (k,v) => { try { localStorage.setItem("mp_"+k,JSON.stringify(v)); } catch {} };

const cloudSave = async (k,v) => {
  lsSet(k,v);
  try { await fetch(`${SUPA_URL}/rest/v1/${TABLE}`,{method:"POST",headers:SH,body:JSON.stringify({key:k,value:v,updated_at:new Date().toISOString()})}); }
  catch(e) { console.warn("save failed",e); }
};

const cloudLoad = async (k,fb) => {
  try {
    const r=await fetch(`${SUPA_URL}/rest/v1/${TABLE}?key=eq.${k}&select=value`,{headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`}});
    if(!r.ok) return lsGet(k,fb);
    const rows=await r.json();
    if(rows&&rows.length>0){ lsSet(k,rows[0].value); return rows[0].value; }
    return fb;
  } catch { return lsGet(k,fb); }
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const nb = {background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#374151",fontFamily:"inherit"};
const bd = {fontSize:12,padding:"7px 14px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600};
const bg = {fontSize:12,padding:"7px 14px",background:"#6B7280",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600};
const ss = {fontSize:12,padding:"6px 8px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit",background:"#fff",color:"#374151",cursor:"pointer"};

function Pill({pid,small}) {
  const p=gp(pid); if(!p) return null;
  return <span style={{fontSize:small?9:10,fontWeight:700,color:p.color,background:p.light,border:`1px solid ${p.color}44`,borderRadius:20,padding:small?"1px 6px":"2px 8px",whiteSpace:"nowrap"}}>{p.short}</span>;
}

function SecHead({title,sub}) {
  return <div style={{marginBottom:20}}><div style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:4}}>Wi-Tronix · {YEAR}</div><h2 style={{fontSize:22,fontWeight:800,color:"#111827",margin:0,letterSpacing:"-0.02em"}}>{title}</h2>{sub&&<div style={{fontSize:13,color:"#6B7280",marginTop:4}}>{sub}</div>}</div>;
}

function WNav({week,setWeek}) {
  return <div style={{display:"flex",alignItems:"center",gap:12}}><button onClick={()=>setWeek(w=>Math.max(0,w-1))} style={nb}>◀</button><span style={{fontSize:14,fontWeight:700,color:"#111827",minWidth:60,textAlign:"center"}}>{WEEK_DATES[week]}</span><button onClick={()=>setWeek(w=>Math.min(WEEK_DATES.length-1,w+1))} style={nb}>▶</button></div>;
}

function PBtn({label,icon}) {
  return <button style={{fontSize:11,padding:"6px 12px",background:"#F3F4F6",color:"#9CA3AF",border:"1.5px dashed #D1D5DB",borderRadius:6,cursor:"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>{icon} {label} <span style={{fontSize:9}}>(soon)</span></button>;
}

const callAI = async prompt => {
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
  const d=await r.json(); return d.content?.[0]?.text||"";
};

// ── Annual ────────────────────────────────────────────────────────────────────
function AnnualScreen({freeform,setFreeform,parsed,setParsed}) {
  const [open,setOpen]=useState(null);
  const [loading,setLoading]=useState(null);
  const [editPid,setEditPid]=useState(null);
  const [draft,setDraft]=useState("");

  const saveFF=(pid,val)=>{ const n={...freeform,[pid]:val}; setFreeform(n); cloudSave("annual_freeform",n); };
  const parseAI=async pid=>{
    const text=freeform[pid]||""; if(!text.trim()) return;
    setLoading(pid);
    try {
      const p=gp(pid);
      const raw=await callAI(`Extract tasks from planning notes for "${p.label}" in ${YEAR}. If specific month named use index (0=Jan). If only quarter, set month=-1. Return ONLY JSON array:\n[{"text":"task","month":4,"quarter":"Q2","pid":${pid}}]\nNotes: ${text}`);
      const items=JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,"").trim());
      const n={...parsed,[pid]:items.map(i=>({...i,id:Date.now()+Math.random(),weekAssigned:null,startDay:0,endDay:4}))};
      setParsed(n); cloudSave("annual_parsed",n);
    } catch(e){console.error(e);}
    setLoading(null);
  };

  return (
    <div>
      <SecHead title="Annual Command Center" sub="Write freely · AI maps your plans to the quarterly calendar"/>
      <div style={{fontSize:12,color:"#1D4ED8",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,padding:"10px 14px",marginBottom:20,lineHeight:1.6}}>
        💡 Write naturally — mention Q1, specific months, or describe goals. Hit <strong>"Parse with AI"</strong> to map to the Quarterly Calendar.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {PRIORITIES.map(p=>{
          const isOpen=open===p.id, items=parsed[p.id]||[];
          return (
            <div key={p.id} style={{background:"#fff",border:`1.5px solid ${p.color}33`,borderLeft:`4px solid ${p.color}`,borderRadius:10,overflow:"hidden"}}>
              <div onClick={()=>setOpen(isOpen?null:p.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 18px",cursor:"pointer",background:isOpen?p.bg:"#fff"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:26,height:26,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:800}}>{p.short}</span>
                  <span style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{p.label}</span>
                  {items.length>0&&<span style={{fontSize:9,color:p.color,background:p.light,border:`1px solid ${p.color}33`,borderRadius:10,padding:"1px 8px"}}>{items.length} parsed</span>}
                </div>
                <span style={{color:"#ccc"}}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen&&(
                <div style={{borderTop:`1px solid ${p.color}22`}}>
                  <div style={{padding:"16px 18px",background:p.bg}}>
                    {editPid===p.id?(
                      <div>
                        <textarea autoFocus value={draft} onChange={e=>setDraft(e.target.value)} style={{width:"100%",minHeight:130,fontSize:13,border:`1.5px solid ${p.color}66`,borderRadius:8,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#333",lineHeight:1.7,background:"#fff"}} placeholder="Write freely…"/>
                        <div style={{display:"flex",gap:8,marginTop:8}}>
                          <button onClick={()=>{saveFF(p.id,draft);setEditPid(null);}} style={{...bd,background:p.color}}>Save</button>
                          <button onClick={()=>setEditPid(null)} style={bg}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <div onClick={()=>{setEditPid(p.id);setDraft(freeform[p.id]||"");}} style={{cursor:"text",padding:"10px 12px",background:"#fff",borderRadius:8,border:`1px solid ${p.color}33`,minHeight:60}}>
                        {freeform[p.id]?<div style={{fontSize:13,color:"#374151",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{freeform[p.id]}</div>:<div style={{fontSize:12,color:"#ccc",fontStyle:"italic"}}>Click to write…</div>}
                      </div>
                    )}
                    {freeform[p.id]&&editPid!==p.id&&(
                      <button onClick={()=>parseAI(p.id)} disabled={loading===p.id} style={{marginTop:10,...bd,background:loading===p.id?"#9CA3AF":"#111827",cursor:loading===p.id?"not-allowed":"pointer"}}>
                        {loading===p.id?"⏳ Parsing…":"✦ Parse with AI → Quarterly Calendar"}
                      </button>
                    )}
                  </div>
                  {items.length>0&&(
                    <div style={{padding:"12px 18px",borderTop:`1px solid ${p.color}22`}}>
                      <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:8}}>PARSED ITEMS</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {items.map(item=>(
                          <div key={item.id} style={{fontSize:11,color:p.color,background:p.light,border:`1px solid ${p.color}33`,borderRadius:6,padding:"3px 9px"}}>
                            <span style={{color:"#9CA3AF",marginRight:4,fontSize:10}}>{item.month===-1?item.quarter:MONTHS[item.month]}</span>{item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WeekBar ───────────────────────────────────────────────────────────────────
function WeekBar({task,onUpdate,onBarDragStart,onBarDragEnd}) {
  const p=gp(task.pid);
  const sd=task.startDay??0, ed=task.endDay??4;
  const left=sd*DAY_W, width=(ed-sd+1)*DAY_W-4;
  const resize=(side,e)=>{
    e.preventDefault(); e.stopPropagation();
    const sx=e.clientX, os=sd, oe=ed;
    const mv=mv2=>{const d=Math.round((mv2.clientX-sx)/DAY_W); side==="left"?onUpdate({startDay:Math.max(0,Math.min(os+d,oe)),endDay:oe}):onUpdate({startDay:os,endDay:Math.min(4,Math.max(oe+d,os))});};
    const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
  };
  return (
    <div draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("movedTaskId",String(task.id));e.dataTransfer.setData("action","moveBar");onBarDragStart&&onBarDragStart(task.id);}} onDragEnd={()=>onBarDragEnd&&onBarDragEnd()}
      style={{position:"absolute",left,top:3,width,height:20,background:p?.color,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"space-between",overflow:"hidden",zIndex:10,boxShadow:"0 1px 4px rgba(0,0,0,0.2)",userSelect:"none",cursor:"grab"}}>
      <div onMouseDown={e=>resize("left",e)} style={{width:10,height:"100%",cursor:"ew-resize",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:7,color:"#fff"}}>◂</span></div>
      <span style={{fontSize:9,color:"#fff",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"center",padding:"0 2px"}}>{task.text.length>20?task.text.slice(0,18)+"…":task.text}</span>
      <div onMouseDown={e=>resize("right",e)} style={{width:10,height:"100%",cursor:"ew-resize",background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:7,color:"#fff"}}>▸</span></div>
    </div>
  );
}

// ── Quarterly ─────────────────────────────────────────────────────────────────
function QuarterlyScreen({parsed,setParsed,mergeTD,setMergeTD}) {
  const [quarter,setQuarter]=useState(1);
  const [dragItem,setDragItem]=useState(null);
  const [dropTarget,setDropTarget]=useState(null);
  const [dragBarId,setDragBarId]=useState(null);
  const qm=Q_MONTHS[QUARTERS[quarter]], ql=QUARTERS[quarter];
  const all=PRIORITIES.flatMap(p=>(parsed[p.id]||[]).map(t=>({...t,pid:p.id})));
  const qLevel=all.filter(t=>t.month===-1&&t.quarter===ql&&!t.weekAssigned);
  const unassigned=m=>all.filter(t=>t.month===m&&!t.weekAssigned);
  const assigned=m=>all.filter(t=>t.month===m&&!!t.weekAssigned);

  const updP=n=>{setParsed(n);cloudSave("annual_parsed",n);};
  const updM=n=>{setMergeTD(n);cloudSave("merge_td",n);};

  const schedule=(item,wl,month)=>{
    const n={...parsed}; const mu=item.month===-1&&month!==undefined?{month}:{};
    PRIORITIES.forEach(p=>{if(n[p.id])n[p.id]=n[p.id].map(t=>t.id===item.id?{...t,weekAssigned:wl,startDay:0,endDay:4,...mu}:t);});
    updP(n);
    const w={...mergeTD}; if(!(w[wl]||[]).find(e=>e.id===item.id)) w[wl]=[...(w[wl]||[]),{text:item.text,pid:item.pid,id:item.id,fromAnnual:true}];
    updM(w);
  };
  const unschedule=item=>{
    const n={...parsed}; PRIORITIES.forEach(p=>{if(n[p.id])n[p.id]=n[p.id].map(t=>t.id===item.id?{...t,weekAssigned:null,startDay:0,endDay:4}:t);}); updP(n);
    const w={...mergeTD}; Object.keys(w).forEach(wk=>{w[wk]=(w[wk]||[]).filter(t=>t.id!==item.id);}); updM(w);
  };
  const moveBar=(tid,wl)=>{
    const task=all.find(t=>t.id===tid); if(!task) return;
    const w={...mergeTD}; if(task.weekAssigned) w[task.weekAssigned]=(w[task.weekAssigned]||[]).filter(t=>t.id!==tid);
    if(!(w[wl]||[]).find(e=>e.id===tid)) w[wl]=[...(w[wl]||[]),{text:task.text,pid:task.pid,id:tid,fromAnnual:true}]; updM(w);
    const n={...parsed}; PRIORITIES.forEach(p=>{if(n[p.id])n[p.id]=n[p.id].map(t=>t.id===tid?{...t,weekAssigned:wl,startDay:0,endDay:4}:t);}); updP(n);
  };
  const updateBar=(tid,updates)=>{
    const n={...parsed}; PRIORITIES.forEach(p=>{if(n[p.id])n[p.id]=n[p.id].map(t=>t.id===tid?{...t,...updates}:t);}); updP(n);
  };
  const getRows=month=>{
    const fd=new Date(YEAR,month,1).getDay(), dim=new Date(YEAR,month+1,0).getDate(), off=fd===0?6:fd-1;
    const cells=Array.from({length:Math.ceil((off+dim)/7)*7},(_,i)=>{const d=i-off+1;return(d>=1&&d<=dim)?d:null;});
    const rows=[]; for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7)); return rows;
  };
  const ROW_H=34;

  return (
    <div>
      <SecHead title="Quarterly Calendar" sub="Drag tasks onto a week · Resize bar ends · Drag bar to move"/>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setQuarter(q=>Math.max(0,q-1))} style={nb}>◀</button>
        <span style={{fontSize:16,fontWeight:800,color:"#111827"}}>{ql} {YEAR}</span>
        <button onClick={()=>setQuarter(q=>Math.min(3,q+1))} style={nb}>▶</button>
      </div>
      {qLevel.length>0&&(
        <div onDragOver={e=>{e.preventDefault();setDropTarget("qzone");}} onDragLeave={()=>setDropTarget(null)}
          onDrop={e=>{e.preventDefault();const a=e.dataTransfer.getData("action"),id=e.dataTransfer.getData("movedTaskId");if(a==="moveBar"&&id)unschedule(all.find(t=>t.id===Number(id))||{id:Number(id)});setDropTarget(null);setDragBarId(null);}}
          style={{background:dropTarget==="qzone"?"#EFF6FF":"#F8FAFF",border:dropTarget==="qzone"?"2px dashed #2563EB":"1.5px dashed #BFDBFE",borderRadius:10,padding:"12px 16px",marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#2563EB",marginBottom:8}}>{ql} — QUARTER-LEVEL (no specific month)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {qLevel.map(task=>{const p=gp(task.pid);return(
              <div key={task.id} draggable onDragStart={e=>{setDragItem(task);e.dataTransfer.setData("action","newTask");}} onDragEnd={()=>{setDragItem(null);setDropTarget(null);}}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:7,background:p?.light,border:`1.5px solid ${p?.color}44`,cursor:"grab",userSelect:"none",opacity:dragItem?.id===task.id?0.35:1}}>
                <span style={{fontSize:11,color:p?.color,opacity:0.5}}>⠿</span>
                <span style={{fontSize:12,color:p?.color}}>{task.text}</span>
                <Pill pid={task.pid} small/>
              </div>
            );})}
          </div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {qm.map(month=>{
          const rows=getRows(month), ua=unassigned(month), asgn=assigned(month);
          return (
            <div key={month} style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:12,overflow:"hidden"}}>
              <div style={{background:"#111827",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:14,fontWeight:800,color:"#F9FAFB"}}>{MONTH_FULL[month]}</div>
                <div style={{fontSize:10,color:"#6B7280"}}>{all.filter(t=>t.month===month).length} tasks · {asgn.length} scheduled</div>
              </div>
              <div style={{display:"flex"}}>
                <div style={{flex:"0 0 300px",padding:"10px 12px",borderRight:"1px solid #F3F4F6"}}>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(7,${DAY_W}px)`,gap:1,marginBottom:4}}>
                    {DAYS_S.map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,color:"#9CA3AF",fontWeight:700,width:DAY_W}}>{d}</div>)}
                  </div>
                  {rows.map((week,wi)=>{
                    const fv=week.find(d=>d!==null), wl=fv?getWeekLabel(YEAR,month,fv):null;
                    const isOver=(dropTarget?.month===month&&dropTarget?.weekLabel===wl)&&(dragItem||dragBarId);
                    const wat=wl?asgn.filter(t=>t.weekAssigned===wl):[];
                    return (
                      <div key={wi} style={{position:"relative",marginBottom:2}}
                        onDragOver={e=>{e.preventDefault();if(wl)setDropTarget({month,weekLabel:wl});}}
                        onDragLeave={()=>setDropTarget(null)}
                        onDrop={e=>{
                          e.preventDefault();
                          const a=e.dataTransfer.getData("action"),id=e.dataTransfer.getData("movedTaskId");
                          if(wl){if(a==="moveBar"&&id)moveBar(Number(id),wl);else if(dragItem)schedule(dragItem,wl,month);}
                          setDropTarget(null);setDragItem(null);setDragBarId(null);
                        }}>
                        <div style={{display:"grid",gridTemplateColumns:`repeat(7,${DAY_W}px)`,gap:1,height:ROW_H,background:isOver?"#EFF6FF":"transparent",border:isOver?"2px dashed #2563EB":"2px solid transparent",borderRadius:6,padding:"2px",boxSizing:"border-box"}}>
                          {week.map((d,di)=>(
                            <div key={di} style={{height:"100%",padding:"2px 3px",background:d?"#FAFAFA":"transparent",border:d?"1px solid #F3F4F6":"none",borderRadius:3,display:"flex",flexDirection:"column"}}>
                              {d&&<div style={{fontSize:9,color:"#9CA3AF",fontWeight:600}}>{d}</div>}
                            </div>
                          ))}
                        </div>
                        {wat.map(task=>(
                          <div key={task.id} style={{position:"absolute",top:0,left:0,width:"100%",height:ROW_H,pointerEvents:"none"}}>
                            <div style={{position:"relative",height:ROW_H,pointerEvents:"all"}}>
                              <WeekBar task={task} onUpdate={u=>updateBar(task.id,u)} onBarDragStart={id=>setDragBarId(id)} onBarDragEnd={()=>setDragBarId(null)}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div style={{flex:1,padding:"12px 14px"}}>
                  {ua.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>DRAG TO SCHEDULE</div>
                      {ua.map(task=>{const p=gp(task.pid);return(
                        <div key={task.id} draggable onDragStart={e=>{setDragItem(task);e.dataTransfer.setData("action","newTask");}} onDragEnd={()=>{setDragItem(null);setDropTarget(null);}}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",marginBottom:4,borderRadius:7,background:p?.light,border:`1.5px solid ${p?.color}44`,cursor:"grab",userSelect:"none",opacity:dragItem?.id===task.id?0.35:1}}>
                          <span style={{fontSize:12,color:p?.color,opacity:0.5}}>⠿</span>
                          <span style={{fontSize:12,color:p?.color,flex:1,lineHeight:1.3}}>{task.text}</span>
                          <Pill pid={task.pid} small/>
                        </div>
                      );})}
                    </div>
                  )}
                  {asgn.length>0&&(
                    <div>
                      <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>SCHEDULED</div>
                      {asgn.map(task=>{const p=gp(task.pid),sd=task.startDay??0,ed=task.endDay??4;return(
                        <div key={task.id} draggable onDragStart={e=>{setDragBarId(task.id);e.dataTransfer.setData("action","moveBar");e.dataTransfer.setData("movedTaskId",String(task.id));}} onDragEnd={()=>{setDragBarId(null);setDropTarget(null);}}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",marginBottom:4,borderRadius:7,background:"#F9FAFB",border:"1px solid #E5E7EB",cursor:"grab"}}>
                          <span style={{fontSize:10,color:"#10B981"}}>✓</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,color:"#6B7280",textDecoration:"line-through"}}>{task.text}</div>
                            <div style={{fontSize:9,color:"#9CA3AF"}}>wk {task.weekAssigned} · {ed-sd===4?"Full week":DAYS.slice(sd,ed+1).join("–")}</div>
                          </div>
                          <Pill pid={task.pid} small/>
                          <button onClick={()=>unschedule(task)} style={{background:"none",border:"none",cursor:"pointer",color:"#D1D5DB",fontSize:14,padding:0}}>×</button>
                        </div>
                      );})}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div onDragOver={e=>{e.preventDefault();setDropTarget("ub");}} onDragLeave={()=>setDropTarget(null)}
        onDrop={e=>{e.preventDefault();const a=e.dataTransfer.getData("action"),id=e.dataTransfer.getData("movedTaskId");if(a==="moveBar"&&id){const t=all.find(t=>t.id===Number(id));if(t)unschedule(t);}setDropTarget(null);setDragBarId(null);}}
        style={{marginTop:16,padding:"12px",borderRadius:10,textAlign:"center",background:dropTarget==="ub"?"#FEF2F2":"#FAFAF8",border:dropTarget==="ub"?"2px dashed #DC2626":"1.5px dashed #E5E7EB",fontSize:11,color:"#9CA3AF",fontStyle:"italic"}}>
        ↓ Drop a scheduled bar here to unschedule it
      </div>
    </div>
  );
}

// ── Weekly Merge ──────────────────────────────────────────────────────────────
function WeeklyMergeScreen({mergeTD,setMergeTD,bottomUp,setBottomUp,buRaw,setBuRaw}) {
  const [week,setWeek]=useState(0);
  const [aiLoad,setAiLoad]=useState(false);
  const [newText,setNewText]=useState("");
  const [newPid,setNewPid]=useState(1);
  const [editId,setEditId]=useState(null);
  const [editVal,setEditVal]=useState("");
  const wk=WEEK_DATES[week];
  const td=mergeTD[wk]||[], bu=bottomUp[wk]||[];
  const all=[...td,...bu.filter(i=>!i.done)];

  const addTD=()=>{
    if(!newText.trim()) return;
    const n={...mergeTD,[wk]:[...td,{text:newText,pid:newPid,id:Date.now(),fromAnnual:false}]};
    setMergeTD(n); cloudSave("merge_td",n); setNewText("");
  };
  const parseBU=async()=>{
    const raw=buRaw[wk]||""; if(!raw.trim()) return;
    setAiLoad(true);
    try {
      const resp=await callAI(`Convert rough notes into clean action items (under 12 words). Assign pid: ${PRIORITIES.map(p=>`${p.id}=${p.label}`).join(", ")}. Return ONLY JSON:\n[{"text":"item","pid":1}]\nNotes: ${raw}`);
      const items=JSON.parse(resp.replace(/\`\`\`json|\`\`\`/g,"").trim());
      const n={...bottomUp,[wk]:items.map(i=>({...i,id:Date.now()+Math.random(),done:false}))};
      setBottomUp(n); cloudSave("merge_bu",n);
    } catch(e){console.error(e);}
    setAiLoad(false);
  };
  const toggleBU=id=>{const n={...bottomUp,[wk]:bu.map(i=>i.id===id?{...i,done:!i.done}:i)};setBottomUp(n);cloudSave("merge_bu",n);};
  const saveEdit=item=>{
    if(!editVal.trim()){setEditId(null);return;}
    const inTD=td.find(t=>t.id===item.id);
    if(inTD){const n={...mergeTD,[wk]:td.map(t=>t.id===item.id?{...t,text:editVal}:t)};setMergeTD(n);cloudSave("merge_td",n);}
    else{const n={...bottomUp,[wk]:bu.map(t=>t.id===item.id?{...t,text:editVal}:t)};setBottomUp(n);cloudSave("merge_bu",n);}
    setEditId(null);
  };
  const delItem=item=>{
    if(td.find(t=>t.id===item.id)){const n={...mergeTD,[wk]:td.filter(t=>t.id!==item.id)};setMergeTD(n);cloudSave("merge_td",n);}
    else{const n={...bottomUp,[wk]:bu.filter(t=>t.id!==item.id)};setBottomUp(n);cloudSave("merge_bu",n);}
  };

  return (
    <div>
      <SecHead title="Weekly Merge" sub="Top-down + bottom-up → this week's plan"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <WNav week={week} setWeek={setWeek}/>
        <PBtn label="Connect Outlook / Teams" icon="🔗"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:"#fff",border:"1.5px solid #E0E7FF",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",color:"#2563EB",marginBottom:10}}>↓ FROM ANNUAL PLAN</div>
          {td.length===0&&<div style={{fontSize:11,color:"#ccc",fontStyle:"italic",marginBottom:10}}>Drag tasks from Quarterly Calendar to populate, or add below.</div>}
          {td.map(item=>{const p=gp(item.pid);return(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:p?.color,flexShrink:0}}/>
              <span style={{fontSize:13,flex:1,color:"#374151"}}>{item.text}</span>
              <Pill pid={item.pid} small/>
            </div>
          );})}
          <div style={{display:"flex",gap:6,marginTop:12}}>
            <input value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTD()} placeholder="Add more…" style={{flex:1,fontSize:12,padding:"6px 9px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}/>
            <select value={newPid} onChange={e=>setNewPid(Number(e.target.value))} style={{...ss,fontSize:11}}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.short}</option>)}</select>
            <button onClick={addTD} style={bd}>+</button>
          </div>
        </div>
        <div style={{background:"#fff",border:"1.5px solid #FEF3C7",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",color:"#D97706",marginBottom:10}}>↑ FROM EMAIL / VERBAL</div>
          <textarea value={buRaw[wk]||""} onChange={e=>{const n={...buRaw,[wk]:e.target.value};setBuRaw(n);cloudSave("merge_bu_raw",n);}} placeholder={"Paste emails or type tasks…"} style={{width:"100%",minHeight:120,fontSize:12,border:"1.5px solid #FDE68A",borderRadius:8,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.6}}/>
          <button onClick={parseBU} disabled={aiLoad} style={{marginTop:8,...bd,background:aiLoad?"#9CA3AF":"#D97706",cursor:aiLoad?"not-allowed":"pointer"}}>{aiLoad?"⏳ Parsing…":"✦ AI → Clean Task List"}</button>
          {bu.length>0&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>PARSED TASKS</div>
              {bu.map(item=>{const p=gp(item.pid);return(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",marginBottom:3,borderRadius:6,background:item.done?"#F9FAFB":p?.light||"#F9FAFB",border:`1px solid ${item.done?"#E5E7EB":p?.color+"33"||"#E5E7EB"}`}}>
                  <input type="checkbox" checked={!!item.done} onChange={()=>toggleBU(item.id)} style={{cursor:"pointer",accentColor:p?.color,flexShrink:0}}/>
                  <span style={{fontSize:12,flex:1,color:item.done?"#9CA3AF":"#374151",textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                  {p&&<Pill pid={item.pid} small/>}
                </div>
              );})}
            </div>
          )}
        </div>
      </div>
      {all.length>0&&(
        <div style={{marginTop:14,background:"#F8FAFF",border:"1.5px solid #DBEAFE",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.12em",color:"#1D4ED8",marginBottom:10}}>THIS WEEK'S PLAN — {wk}</div>
          {all.map(item=>{const p=gp(item.pid),isEd=editId===item.id;return(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #E0E7FF"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:p?.color,flexShrink:0}}/>
              {isEd?(
                <div style={{display:"flex",gap:6,flex:1,alignItems:"center"}}>
                  <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(item);if(e.key==="Escape")setEditId(null);}} style={{flex:1,fontSize:12,padding:"4px 8px",border:`1.5px solid ${p?.color||"#2563EB"}`,borderRadius:5,outline:"none",fontFamily:"inherit"}}/>
                  <button onClick={()=>saveEdit(item)} style={{...bd,fontSize:10,padding:"3px 8px"}}>✓</button>
                  <button onClick={()=>setEditId(null)} style={{...bg,fontSize:10,padding:"3px 8px"}}>✕</button>
                </div>
              ):(
                <span onClick={()=>{setEditId(item.id);setEditVal(item.text);}} style={{fontSize:13,flex:1,color:"#1e3a8a",cursor:"text"}}>{item.text}</span>
              )}
              {!isEd&&<Pill pid={item.pid} small/>}
              {!isEd&&<button onClick={()=>delItem(item)} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E1",fontSize:15,padding:0,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#CBD5E1"}>×</button>}
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

// ── Timetable ─────────────────────────────────────────────────────────────────
function TimetableScreen({mergeTD,gridBlocks,setGridBlocks,extraTasks,setExtraTasks,scheduledIds,setScheduledIds,isMobile}) {
  const TCOL_W = isMobile ? 80 : "auto"; // auto = stretch to fill
  const [week,setWeek]=useState(0);
  const [dragTask,setDragTask]=useState(null);
  const [newExtra,setNewExtra]=useState("");
  const [inlineEdit,setInlineEdit]=useState(null);
  const [inlineVal,setInlineVal]=useState("");
  const wk=WEEK_DATES[week];
  const td=mergeTD[wk]||[], bu=(lsGet("merge_bu",{})[wk]||[]).filter(i=>!i.done);
  const panel=[...td,...bu,...extraTasks];
  const ck=(day,si)=>`${wk}-${day}-${si}`;
  const [dragBlock, setDragBlock] = useState(null); // {key, day, si} of block being dragged

  const drop=(day,si)=>{
    const k=ck(day,si);
    if(dragBlock) {
      // Move existing block to new position
      if(dragBlock.key === k) { setDragBlock(null); return; }
      const block = gridBlocks[dragBlock.key];
      if(!block) { setDragBlock(null); return; }
      const n={...gridBlocks};
      delete n[dragBlock.key];
      n[k]={...block};
      setGridBlocks(n); cloudSave("tt_blocks",n);
      setDragBlock(null);
      return;
    }
    if(!dragTask) return;
    const n={...gridBlocks,[k]:{text:dragTask.text,pid:dragTask.pid,id:dragTask.id,slots:2,source:"manual"}};
    setGridBlocks(n); cloudSave("tt_blocks",n);
    const s=[...new Set([...scheduledIds,dragTask.id])]; setScheduledIds(s); cloudSave("tt_scheduled_ids",s);
    setDragTask(null);
  };
  const remBlock=k=>{
    const b=gridBlocks[k];
    if(b){const s=scheduledIds.filter(id=>id!==b.id);setScheduledIds(s);cloudSave("tt_scheduled_ids",s);}
    const n={...gridBlocks};delete n[k];setGridBlocks(n);cloudSave("tt_blocks",n);
  };
  const saveInline=(day,si)=>{
    if(!inlineVal.trim()){setInlineEdit(null);return;}
    const k=ck(day,si),n={...gridBlocks,[k]:{text:inlineVal,pid:1,id:Date.now(),slots:2,source:"manual"}};
    setGridBlocks(n);cloudSave("tt_blocks",n);setInlineEdit(null);setInlineVal("");
  };
  const addExtra=()=>{
    if(!newExtra.trim()) return;
    const n=[...extraTasks,{text:newExtra,pid:1,id:Date.now()}];setExtraTasks(n);cloudSave("tt_extra",n);setNewExtra("");
  };
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing,  setImporting]  = useState(false);

  const importFromCopilot = () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.trim().split("\n").filter(l => l.trim() && !l.includes("---") && !l.toLowerCase().includes("day |"));
      // Start fresh — only keep manually added blocks, replace all outlook ones
      const next = {};
      Object.keys(gridBlocks).forEach(k => {
        if (gridBlocks[k].source === "manual") next[k] = gridBlocks[k];
      });
      const dayMap = { "mon":0, "tue":1, "wed":2, "thu":3, "fri":4 };
      lines.forEach(line => {
        // Handle pipe-separated: Mon 5/4 | 11:30 AM | 11:55 AM | Title
        // Also handle space-separated: Mon 5/4  11:30 AM  11:55 AM  Title
        let parts;
        if (line.includes("|")) {
          parts = line.split("|").map(p => p.trim()).filter(p => p);
        } else {
          const m = line.match(/^(\S+\s+\S+)\s+(\d+:\d+\s*[ap]m)\s+(\d+:\d+\s*[ap]m)\s+(.+)/i);
          if (!m) return;
          parts = [m[1], m[2], m[3], m[4]];
        }
        if (parts.length < 4) return;
        const [dayDate, startStr, endStr, ...titleParts] = parts;
        const title = titleParts.join(" ").trim();
        const dayWord = dayDate.trim().split(/\s+/)[0].toLowerCase().slice(0,3);
        const di = dayMap[dayWord];
        if (di === undefined) return;

        const parseTime = str => {
          const m = str.trim().match(/(\d+):(\d+)\s*(am|pm)/i);
          if (!m) return null;
          let h = parseInt(m[1]), min = parseInt(m[2]);
          const ap = m[3].toLowerCase();
          if (ap === "pm" && h !== 12) h += 12;
          if (ap === "am" && h === 12) h = 0;
          return h * 60 + min;
        };

        const startMins = parseTime(startStr);
        const endMins   = parseTime(endStr);
        if (startMins === null || endMins === null) return;

        const slotIndex = Math.round((startMins - 7 * 60) / 30);
        const slots     = Math.max(1, Math.ceil((endMins - startMins) / 30));
        if (slotIndex < 0 || slotIndex >= HOURS.length * 2) return;

        const k = ck(DAYS[di], slotIndex);
        next[k] = { text: title, pid: 1, id: Date.now() + Math.random(), slots, source: "outlook" };
      });
      setGridBlocks(next); cloudSave("tt_blocks", next);
      setShowImport(false); setImportText("");
    } catch(e) { console.error(e); }
    setImporting(false);
  };

  const exportICS = () => {
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mihir Planner//EN","CALSCALE:GREGORIAN"];
    // Map week day names to actual dates for current week
    const weekStart = new Date(2026, 4, 4); // May 4 2026 as base
    const weekIdx = WEEK_DATES.indexOf(wk);
    const baseDate = new Date(2026, 4, 4 + weekIdx * 7);
    DAYS.forEach((day, di) => {
      const date = new Date(baseDate); date.setDate(baseDate.getDate() + di);
      const dateStr = date.toISOString().slice(0,10).replace(/-/g,"");
      for (let si = 0; si < HOURS.length * 2; si++) {
        const b = gridBlocks[ck(day, si)];
        if (!b || b.source !== "manual") continue;
        const startHour = 7 + Math.floor(si / 2);
        const startMin  = (si % 2) * 30;
        const endSi     = si + (b.slots || 1);
        const endHour   = 7 + Math.floor(endSi / 2);
        const endMin    = (endSi % 2) * 30;
        const fmt = (h,m) => `${String(h).padStart(2,"0")}${String(m).padStart(2,"0")}00`;
        lines.push("BEGIN:VEVENT",
          `DTSTART:${dateStr}T${fmt(startHour,startMin)}`,
          `DTEND:${dateStr}T${fmt(endHour,endMin)}`,
          `SUMMARY:${b.text}`,
          `UID:${Date.now()+Math.random()}@mihirplanner`,
          "END:VEVENT");
      }
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], {type:"text/calendar"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`week-${wk.replace(" ","-")}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const occ={};
  DAYS.forEach(day=>{for(let si=0;si<HOURS.length*2;si++){const b=gridBlocks[ck(day,si)];if(b)for(let s=1;s<b.slots;s++)occ[`${day}-${si+s}`]=si;}});

  const print=()=>{
    const w=window.open('','_blank');
    w.document.write(`<html><head><title>Week of ${wk}</title><style>body{font-family:Georgia,serif;margin:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:5px;font-size:10px;vertical-align:top;height:18px;}th{background:#f5f5f5;font-weight:700;text-align:center;}.hr{color:#aaa;font-size:9px;text-align:right;width:36px;background:#fafafa;}@media print{@page{size:landscape;margin:10mm;}}</style></head><body>`);
    w.document.write(`<h2 style="font-size:15px">Week of ${wk} · ${YEAR}</h2><table><thead><tr><th class="hr"></th>`);
    DAYS.forEach(d=>w.document.write(`<th>${d}</th>`));
    w.document.write('</tr></thead><tbody>');
    HOURS.forEach(h=>[0,1].forEach(half=>{
      const si=(h-7)*2+half;
      w.document.write(`<tr><td class="hr">${half?":30":h<12?h+"am":h===12?"12pm":(h-12)+"pm"}</td>`);
      DAYS.forEach(d=>{const b=gridBlocks[ck(d,si)];w.document.write(`<td>${b?b.text:''}</td>`);});
      w.document.write('</tr>');
    }));
    w.document.write('</tbody></table></body></html>');
    w.document.close();w.print();
  };

  return (
    <div>
      <SecHead title="Hour-by-Hour Timetable" sub="Drag tasks · Resize blocks · Click empty cell to add"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <WNav week={week} setWeek={setWeek}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowImport(true)} style={{...bd,background:"#0078D4"}}>📥 Import from Copilot</button>
          <button onClick={exportICS} style={{...bd,background:"#059669"}}>📤 Export to Outlook (.ics)</button>
          <button onClick={print} style={bd}>⎙ Export for iPad</button>
        </div>
      </div>

      {/* Copilot Import Modal */}
      {showImport && (
        <div style={{background:"#F0F7FF",border:"1.5px solid #BFDBFE",borderRadius:12,padding:"20px",marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1D4ED8",marginBottom:6}}>📥 Import from Copilot</div>
          <div style={{fontSize:12,color:"#3B82F6",marginBottom:12,lineHeight:1.6}}>
            Ask Copilot: <em>"List all my calendar meetings for this week. For each: day, start time, end time, and title only."</em> Then paste the result below.
          </div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)}
            placeholder={"Paste Copilot calendar output here…\n\nMon 5/4  11:30 AM  11:55 AM  Fleet level AI powered insights\nTue 5/5  8:30 AM   8:55 AM   Crowding Microsoft Teams Meeting\n…"}
            style={{width:"100%",minHeight:160,fontSize:12,border:"1.5px solid #93C5FD",borderRadius:8,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.6}}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={importFromCopilot} disabled={importing}
              style={{...bd,background:importing?"#9CA3AF":"#0078D4",cursor:importing?"not-allowed":"pointer"}}>
              {importing?"⏳ Importing…":"📥 Place on Timetable"}
            </button>
            <button onClick={()=>{setShowImport(false);setImportText("");}} style={bg}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
        <div style={{width:165,flexShrink:0}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            THIS WEEK'S TASKS
            <button onClick={()=>{setExtraTasks([]);cloudSave("tt_extra",[]);}} style={{fontSize:9,padding:"2px 6px",background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:4,cursor:"pointer",color:"#9CA3AF",fontFamily:"inherit"}}>Clear</button>
          </div>
          <div style={{fontSize:10,color:"#9CA3AF",marginBottom:8,fontStyle:"italic"}}>Drag onto grid →</div>
          {panel.map(task=>{const p=gp(task.pid),isSched=scheduledIds.includes(task.id);return(
            <div key={task.id} draggable={!isSched} onDragStart={()=>!isSched&&setDragTask(task)} onDragEnd={()=>setDragTask(null)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 7px",marginBottom:3,borderRadius:6,background:isSched?"#F9FAFB":p?.light||"#F0FDF4",border:`1.5px solid ${isSched?"#E5E7EB":p?.color+"44"||"#D1FAE5"}`,cursor:isSched?"default":"grab",userSelect:"none",opacity:dragTask?.id===task.id?0.35:1}}>
              <span style={{fontSize:10,opacity:0.4,color:p?.color}}>⠿</span>
              <span style={{fontSize:11,flex:1,lineHeight:1.3,color:isSched?"#9CA3AF":p?.color||"#374151",textDecoration:isSched?"line-through":"none"}}>{task.text}</span>
            </div>
          );})}
          <div style={{marginTop:10,borderTop:"1px solid #F3F4F6",paddingTop:10}}>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:6}}>ADD TASK</div>
            <input value={newExtra} onChange={e=>setNewExtra(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addExtra()} placeholder="Task name…" style={{width:"100%",fontSize:11,padding:"5px 8px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:5}}/>
            <button onClick={addExtra} style={{...bd,width:"100%",fontSize:11,padding:"5px 0"}}>+ Add to panel</button>
          </div>
        </div>
        <div style={{flex:1,overflowX:isMobile?"auto":"hidden",width:"100%"}}>
          <table style={{borderCollapse:"collapse",tableLayout:"fixed",width:"100%",minWidth:isMobile?500:"auto"}}>
            <colgroup>
              <col style={{width:46}}/>
              {DAYS.map(d=><col key={d} style={{width:isMobile?"80px":"auto"}}/>)}
            </colgroup>
            <thead><tr>
              <th style={{background:"#F9FAFB",border:"1px solid #E5E7EB",fontSize:9,color:"#6B7280",padding:"6px 0"}}></th>
              {DAYS.map(d=><th key={d} style={{background:"#F9FAFB",border:"1px solid #E5E7EB",padding:"7px",fontSize:11,fontWeight:800,color:"#374151",letterSpacing:"0.08em"}}>{d}</th>)}
            </tr></thead>
            <tbody>
              {HOURS.map(h=>[0,1].map(half=>{
                const si=(h-7)*2+half, isH=half===0;
                return (
                  <tr key={`${h}-${half}`} style={{height:CELL_H}}>
                    <td style={{fontSize:isH?11:10,fontWeight:isH?700:400,color:isH?"#374151":"#9CA3AF",textAlign:"right",padding:"0 8px",border:"1px solid #F3F4F6",background:"#F5F5F3",whiteSpace:"nowrap",verticalAlign:"top",paddingTop:4}}>
                      {isH?(h<12?`${h}am`:h===12?"12pm":`${h-12}pm`):":30"}
                    </td>
                    {DAYS.map(day=>{
                      const k=ck(day,si), block=gridBlocks[k], occBy=occ[`${day}-${si}`], isEd=inlineEdit===k;
                      if(occBy!==undefined) return null;
                      if(block){
                        const p=gp(block.pid);
                        return (
                          <td key={day} rowSpan={block.slots} style={{border:"none",padding:"2px 2px 0 2px",verticalAlign:"top",background:"transparent",position:"relative",opacity:dragBlock?.key===k?0.4:1}}
                            draggable
                            onDragStart={e=>{e.stopPropagation();setDragBlock({key:k,day,si});}}
                            onDragEnd={()=>setDragBlock(null)}>
                            <div style={{background:p?.light||"#EFF6FF",border:`2px solid ${p?.color||"#2563EB"}`,borderRadius:4,height:block.slots*CELL_H-4,padding:"3px 6px",display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",cursor:"grab",position:"relative"}}>
                              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:4}}>
                                <span style={{fontSize:10,color:p?.color||"#2563EB",fontWeight:700,lineHeight:1.3,flex:1,overflow:"hidden"}}>{block.text}</span>
                                <button onClick={e=>{e.stopPropagation();remBlock(k);}} style={{background:"none",border:"none",cursor:"pointer",color:p?.color||"#2563EB",fontSize:11,padding:0,opacity:0.6,flexShrink:0}}>×</button>
                              </div>
                              {block.slots>=2&&<div style={{fontSize:8,color:p?.color||"#2563EB",opacity:0.7}}>{block.slots*30}min</div>}
                              <div style={{position:"absolute",bottom:0,left:0,right:0,height:6,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center"}}
                                onMouseDown={e=>{
                                  e.preventDefault(); e.stopPropagation();
                                  const sy=e.clientY,os=block.slots;
                                  const mv=mv2=>{const ns=Math.max(1,Math.min(10,os+Math.round((mv2.clientY-sy)/CELL_H)));const n={...gridBlocks,[k]:{...block,slots:ns}};setGridBlocks(n);cloudSave("tt_blocks",n);};
                                  const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                                  window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                                }}>
                                <div style={{width:24,height:2,borderRadius:2,background:p?.color||"#2563EB",opacity:0.35}}/>
                              </div>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={day} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();drop(day,si);}} onClick={()=>!inlineEdit&&(setInlineEdit(k),setInlineVal(""))}
                          style={{border:"none",borderTop:isH?"1px solid #D1D5DB":"1px solid #F3F4F6",background:"#fff",cursor:"pointer",verticalAlign:"top",padding:"1px 2px"}}>
                          {isEd&&(
                            <div onClick={e=>e.stopPropagation()} style={{padding:"2px 3px"}}>
                              <input autoFocus value={inlineVal} onChange={e=>setInlineVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveInline(day,si);if(e.key==="Escape")setInlineEdit(null);}} placeholder="Task…" style={{width:"100%",fontSize:10,border:"1px solid #2563EB",borderRadius:3,padding:"2px 4px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                              <button onClick={()=>saveInline(day,si)} style={{marginTop:2,fontSize:9,padding:"1px 6px",background:"#111827",color:"#fff",border:"none",borderRadius:3,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Retro ─────────────────────────────────────────────────────────────────────
const SC = label => { const p=PRIORITIES.find(p=>p.label===label); return p?.color||"#6B7280"; };
const SL = label => { const p=PRIORITIES.find(p=>p.label===label); return p?.light||"#F3F4F6"; };

function RetroCard({item,sectionKey,borderColor,editingId,setEditingId,editVal,setEditVal,onSave,onDelete}) {
  const isEd=editingId===item.id;
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",marginBottom:5,borderRadius:8,background:SL(item.stream),border:`1px solid ${SC(item.stream)}33`}}>
      <span style={{fontSize:12,marginTop:2,color:borderColor,flexShrink:0}}>
        {borderColor==="#059669"?"✓":borderColor==="#DC2626"?"○":"→"}
      </span>
      <div style={{flex:1}}>
        {isEd?(
          <div>
            <textarea autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==="Escape"&&setEditingId(null)}
              style={{width:"100%",minHeight:70,fontSize:12,padding:"6px 8px",border:`1.5px solid ${SC(item.stream)}`,borderRadius:6,outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",lineHeight:1.6,color:"#374151"}}/>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <button onClick={onSave} style={{...bd,fontSize:10,padding:"3px 10px"}}>Save</button>
              <button onClick={()=>setEditingId(null)} style={{...bg,fontSize:10,padding:"3px 10px"}}>Cancel</button>
            </div>
          </div>
        ):(
          <span onClick={()=>{setEditingId(item.id);setEditVal(item.text);}} style={{fontSize:13,color:"#374151",lineHeight:1.5,cursor:"text",display:"block"}}>{item.text}</span>
        )}
      </div>
      <span style={{fontSize:9,color:SC(item.stream),background:"#fff",border:`1px solid ${SC(item.stream)}44`,borderRadius:10,padding:"1px 8px",whiteSpace:"nowrap",alignSelf:"flex-start",marginTop:2}}>{item.stream}</span>
      <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#D1D5DB",fontSize:15,padding:0,lineHeight:1,alignSelf:"flex-start",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#D1D5DB"}>×</button>
    </div>
  );
}

function RetroScreen({rawNotes,setRawNotes,organized,setOrganized}) {
  const [week,setWeek]=useState(0);
  const [loading,setLoading]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [editVal,setEditVal]=useState("");
  const wk=WEEK_DATES[week];

  const organize=async()=>{
    const raw=rawNotes[wk]||""; if(!raw.trim()) return;
    setLoading(true);
    try {
      const resp=await callAI(`Organize weekly notes into retro. Streams: ${PRIORITIES.map(p=>p.label).join(", ")}, Other.\nReturn ONLY JSON:\n{"got_done":[{"text":"item","stream":"Customer Engagements"}],"not_done":[{"text":"item","stream":"CDS"}],"lessons":[{"text":"lesson","stream":"Other"}]}\nNotes: ${raw}`);
      const p=JSON.parse(resp.replace(/\`\`\`json|\`\`\`/g,"").trim());
      const ai=arr=>(arr||[]).map(i=>({...i,id:Date.now()+Math.random()}));
      const n={...organized,[wk]:{got_done:ai(p.got_done),not_done:ai(p.not_done),lessons:ai(p.lessons)}};
      setOrganized(n); cloudSave("retro_org",n);
    } catch(e){console.error(e);}
    setLoading(false);
  };
  const del=(sec,id)=>{
    const org=organized[wk]; if(!org) return;
    const n={...organized,[wk]:{...org,[sec]:org[sec].filter(i=>i.id!==id)}};
    setOrganized(n); cloudSave("retro_org",n);
  };
  const save=(sec,id)=>{
    const org=organized[wk]; if(!org) return;
    const n={...organized,[wk]:{...org,[sec]:org[sec].map(i=>i.id===id?{...i,text:editVal}:i)}};
    setOrganized(n); cloudSave("retro_org",n); setEditingId(null);
  };
  const org=organized[wk];
  const renderSection=(title,sectionKey,borderColor)=>{
    if(!org||!(org[sectionKey]||[]).length) return null;
    return (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.1em",color:borderColor,marginBottom:8}}>{title}</div>
        {org[sectionKey].map(item=>(
          <RetroCard key={item.id} item={item} sectionKey={sectionKey} borderColor={borderColor} editingId={editingId} setEditingId={setEditingId} editVal={editVal} setEditVal={setEditVal} onSave={()=>save(sectionKey,item.id)} onDelete={()=>del(sectionKey,item.id)}/>
        ))}
      </div>
    );
  };

  return (
    <div>
      <SecHead title="Weekly Retro" sub="Dump your notes · AI organizes · Click to edit · × to delete"/>
      <WNav week={week} setWeek={setWeek}/>
      <div style={{display:"grid",gridTemplateColumns:org?"1fr 1fr":"1fr",gap:16,marginTop:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:8}}>YOUR RAW NOTES</div>
          <textarea value={rawNotes[wk]||""} onChange={e=>{const n={...rawNotes,[wk]:e.target.value};setRawNotes(n);cloudSave("retro_raw",n);}} placeholder={"Dump everything here…"} style={{width:"100%",minHeight:280,fontSize:13,border:"1.5px solid #E5E7EB",borderRadius:10,padding:"14px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.7,background:"#fff"}}/>
          <button onClick={organize} disabled={loading} style={{marginTop:10,...bd,background:loading?"#9CA3AF":"#111827",cursor:loading?"not-allowed":"pointer",fontSize:13,padding:"9px 20px"}}>{loading?"⏳ Organizing…":"✦ Clearly Organize with AI"}</button>
        </div>
        {org&&(
          <div>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:4}}>ORGANIZED — week of {wk}</div>
            <div style={{fontSize:10,color:"#9CA3AF",fontStyle:"italic",marginBottom:12}}>Click any item to edit · × to delete</div>
            {renderSection("✓ GOT DONE","got_done","#059669")}
            {renderSection("○ DIDN'T GET DONE","not_done","#DC2626")}
            {renderSection("→ LESSONS LEARNED","lessons","#D97706")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(()=>{
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  },[]);
  const [freeform,setFreeform]=useState(()=>lsGet("annual_freeform",{}));
  const [parsed,setParsed]=useState(()=>lsGet("annual_parsed",{}));
  const [mergeTD,setMergeTD]=useState(()=>lsGet("merge_td",{}));
  const [bottomUp,setBottomUp]=useState(()=>lsGet("merge_bu",{}));
  const [buRaw,setBuRaw]=useState(()=>lsGet("merge_bu_raw",{}));
  const [gridBlocks,setGridBlocks]=useState(()=>lsGet("tt_blocks",{}));
  const [extraTasks,setExtraTasks]=useState(()=>lsGet("tt_extra",[]));
  const [scheduledIds,setScheduledIds]=useState(()=>lsGet("tt_scheduled_ids",[]));
  const [rawNotes,setRawNotes]=useState(()=>lsGet("retro_raw",{}));
  const [organized,setOrganized]=useState(()=>lsGet("retro_org",{}));
  const [syncing,setSyncing]=useState(true);

  useEffect(()=>{
    Promise.all([
      cloudLoad("annual_freeform",{}),cloudLoad("annual_parsed",{}),cloudLoad("merge_td",{}),
      cloudLoad("merge_bu",{}),cloudLoad("merge_bu_raw",{}),cloudLoad("tt_blocks",{}),
      cloudLoad("tt_extra",[]),cloudLoad("tt_scheduled_ids",[]),cloudLoad("retro_raw",{}),cloudLoad("retro_org",{}),
    ]).then(([ff,pd,mt,bu,br,gb,et,si,rn,og])=>{
      setFreeform(ff);setParsed(pd);setMergeTD(mt);setBottomUp(bu);setBuRaw(br);
      setGridBlocks(gb);setExtraTasks(et);setScheduledIds(si);setRawNotes(rn);setOrganized(og);
      setSyncing(false);
    }).catch(()=>setSyncing(false));
  },[]);

  const screens=[
    <AnnualScreen key="a" freeform={freeform} setFreeform={setFreeform} parsed={parsed} setParsed={setParsed}/>,
    <QuarterlyScreen key="q" parsed={parsed} setParsed={setParsed} mergeTD={mergeTD} setMergeTD={setMergeTD}/>,
    <WeeklyMergeScreen key="w" mergeTD={mergeTD} setMergeTD={setMergeTD} bottomUp={bottomUp} setBottomUp={setBottomUp} buRaw={buRaw} setBuRaw={setBuRaw}/>,
    <TimetableScreen key="t" mergeTD={mergeTD} gridBlocks={gridBlocks} setGridBlocks={setGridBlocks} extraTasks={extraTasks} setExtraTasks={setExtraTasks} scheduledIds={scheduledIds} setScheduledIds={setScheduledIds} isMobile={isMobile}/>,
    <RetroScreen key="r" rawNotes={rawNotes} setRawNotes={setRawNotes} organized={organized} setOrganized={setOrganized}/>,
  ];

  return (
    <div style={{fontFamily:"'Georgia','Times New Roman',serif",background:"#F8F7F5",minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row"}}>
      {/* Mobile top nav bar */}
      {isMobile && (
        <div style={{background:"#111827",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div>
            <div style={{fontSize:8,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.2em"}}>Wi-Tronix</div>
            <div style={{fontSize:13,fontWeight:800,color:"#F9FAFB"}}>My Planner</div>
          </div>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>☰</button>
        </div>
      )}

      {/* Mobile dropdown menu */}
      {isMobile && sidebarOpen && (
        <div style={{background:"#111827",borderBottom:"1px solid #374151",zIndex:49}}>
          {NAV.map((n,i)=>(
            <button key={n} onClick={()=>{setScreen(i);setSidebarOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 20px",background:screen===i?"#1D4ED8":"none",border:"none",cursor:"pointer",color:screen===i?"#fff":"#9CA3AF",fontSize:14,fontFamily:"inherit",fontWeight:screen===i?700:400}}>
              <span style={{fontSize:16}}>{ICONS[i]}</span>{n}
            </button>
          ))}
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{width:200,background:"#111827",flexShrink:0,display:"flex",flexDirection:"column",padding:"24px 0",position:"sticky",top:0,height:"100vh"}}>
          <div style={{padding:"0 20px 24px",borderBottom:"1px solid #374151"}}>
            <div style={{fontSize:9,letterSpacing:"0.2em",color:"#6B7280",textTransform:"uppercase",marginBottom:4}}>Wi-Tronix</div>
            <div style={{fontSize:15,fontWeight:800,color:"#F9FAFB"}}>My Planner</div>
            <div style={{fontSize:9,color:syncing?"#F59E0B":"#10B981",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:syncing?"#F59E0B":"#10B981"}}/>
              {syncing?"Syncing…":"Synced ✓"}
            </div>
          </div>
          <nav style={{flex:1,padding:"16px 0"}}>
            {NAV.map((n,i)=>(
              <button key={n} onClick={()=>setScreen(i)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 20px",background:screen===i?"#1D4ED8":"none",border:"none",cursor:"pointer",textAlign:"left",color:screen===i?"#fff":"#9CA3AF",fontSize:13,fontFamily:"inherit",fontWeight:screen===i?700:400,transition:"all 0.1s"}}>
                <span style={{fontSize:15,opacity:0.8}}>{ICONS[i]}</span>{n}
              </button>
            ))}
          </nav>
          <div style={{padding:"16px 20px",borderTop:"1px solid #374151"}}>
            <div style={{fontSize:9,letterSpacing:"0.15em",color:"#6B7280",textTransform:"uppercase",marginBottom:10}}>Streams</div>
            {PRIORITIES.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{fontSize:10,color:"#D1D5DB",lineHeight:1.3}}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{flex:1,padding:isMobile?"16px":"36px 32px",width:"100%",maxWidth:isMobile?"100%":"none",overflowY:"auto",overflowX:"hidden",boxSizing:"border-box"}}>
        {/* Mobile bottom nav */}
        {isMobile && (
          <div style={{fontSize:9,color:"#9CA3AF",marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:syncing?"#F59E0B":"#10B981"}}/>
            {syncing?"Syncing…":"Synced ✓"} · {NAV[screen]}
          </div>
        )}
        {screens[screen]}
      </div>
    </div>
  );
}
