import { useState, useRef, useEffect, useMemo, Fragment } from "react";

// ── ITEM 1: Updated stream names ──────────────────────────────────────────────
const PRIORITIES = [
  { id:1, label:"Passenger Product",   short:"PP", color:"#2563EB", bg:"#EFF6FF", light:"#DBEAFE" },
  { id:2, label:"CDS",                 short:"CD", color:"#7C3AED", bg:"#F5F3FF", light:"#EDE9FE" },
  { id:3, label:"UC",                  short:"UC", color:"#0891B2", bg:"#ECFEFF", light:"#CFFAFE" },
  { id:4, label:"Execution",           short:"EX", color:"#059669", bg:"#ECFDF5", light:"#D1FAE5" },
  { id:5, label:"AI Native",           short:"AI", color:"#D97706", bg:"#FFFBEB", light:"#FEF3C7" },
  { id:6, label:"Other",               short:"OT", color:"#6B7280", bg:"#F9FAFB", light:"#F3F4F6" },
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

const gp = id => PRIORITIES.find(p=>p.id===id) || PRIORITIES[6];

const getWeekLabel = (year,month,day) => {
  const d=new Date(year,month,day), dow=d.getDay();
  const diff=dow===0?-6:1-dow;
  const mon=new Date(d); mon.setDate(d.getDate()+diff);
  return `${MONTHS[mon.getMonth()]} ${mon.getDate()}`;
};

const daysInMonth    = (y,m) => new Date(y,m+1,0).getDate();
const firstDayOfMonth = (y,m) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

// ── Storage ───────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.REACT_APP_SUPAURL || "https://ggfqzxafrkicekfulceo.supabase.co";
const SUPA_KEY = process.env.REACT_APP_SUPAKEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnF6eGFmcmtpY2VrZnVsY2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzA5MDksImV4cCI6MjA5MzMwNjkwOX0.gSIxrR40RSooK53WrNmPZRBcoF2EKCqwvXbaEOKNlVM";
const TABLE    = "mihir_planner";
const SH = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Prefer":"resolution=merge-duplicates"};

const lsGet = (k,fb) => { try { const v=localStorage.getItem("mp_"+k); return v?JSON.parse(v):fb; } catch { return fb; } };
const lsSet = (k,v)  => { try { localStorage.setItem("mp_"+k,JSON.stringify(v)); } catch {} };

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
    return lsGet(k,fb);
  } catch { return lsGet(k,fb); }
};

// ── AI ────────────────────────────────────────────────────────────────────────
// ITEM 4: Fixed AI routing — works on both Netlify and localhost
const callAI = async prompt => {
  if (window.location.hostname !== "localhost") {
    const r = await fetch("/api/ai", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({prompt}),
    });
    if (!r.ok) throw new Error("AI proxy failed: " + r.status);
    const d = await r.json();
    return d.text || "";
  }
  throw new Error("AI not available on localhost — deploy to Netlify to use AI features");
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const nb = {background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:14,color:"#374151",fontFamily:"inherit"};
const bd = {fontSize:14,padding:"7px 14px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600};
const bg = {fontSize:14,padding:"7px 14px",background:"#6B7280",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600};
const ss = {fontSize:14,padding:"6px 8px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit",background:"#fff",color:"#374151",cursor:"pointer"};

function SecHead({title,sub}) {
  return <div style={{marginBottom:20}}><div style={{fontSize:12,letterSpacing:"0.15em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:4}}>Wi-Tronix · {YEAR}</div><h2 style={{fontSize:22,fontWeight:800,color:"#111827",margin:0,letterSpacing:"-0.02em"}}>{title}</h2>{sub&&<div style={{fontSize:14,color:"#6B7280",marginTop:4}}>{sub}</div>}</div>;
}

function WNav({week,setWeek}) {
  return <div style={{display:"flex",alignItems:"center",gap:12}}><button onClick={()=>setWeek(w=>Math.max(0,w-1))} style={nb}>◀</button><span style={{fontSize:14,fontWeight:700,color:"#111827",minWidth:60,textAlign:"center"}}>{WEEK_DATES[week]}</span><button onClick={()=>setWeek(w=>Math.min(WEEK_DATES.length-1,w+1))} style={nb}>▶</button></div>;
}

function PBtn({label,icon}) {
  return <button style={{fontSize:14,padding:"6px 12px",background:"#F3F4F6",color:"#9CA3AF",border:"1.5px dashed #D1D5DB",borderRadius:6,cursor:"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>{icon} {label} <span style={{fontSize:9}}>(soon)</span></button>;
}

// ── ITEM 2+3: Annual Screen — fluid grid + Save button ─────────────────────────
function AnnualScreen({freeform,setFreeform,parsed,setParsed}) {
  // Per-card draft state — keyed by pid so each card edits independently
  const [drafts,  setDrafts]  = useState({});
  const [loading, setLoading] = useState(null);
  const [aiError, setAiError] = useState({});

  // Initialize drafts from saved freeform on mount
  // Each card shows the saved text; typing updates the local draft only
  const getDraft = pid => drafts[pid] !== undefined ? drafts[pid] : (freeform[pid] || "");
  const setDraft = (pid, val) => setDrafts(d => ({...d, [pid]: val}));

  const saveFF = (pid) => {
    const val = getDraft(pid);
    const n = {...freeform, [pid]: val};
    setFreeform(n);
    cloudSave("annual_freeform", n);
    // Clear local draft after save (now in sync)
    setDrafts(d => ({...d, [pid]: undefined}));
  };

  const cancelEdit = (pid) => {
    // Reset draft to last saved value
    setDrafts(d => ({...d, [pid]: undefined}));
  };

  const parseAI = async pid => {
    const text = freeform[pid] || "";
    if (!text.trim()) return;
    setLoading(pid);
    setAiError(e => ({...e, [pid]: null}));
    try {
      const p = gp(pid);
      const raw = await callAI(
        `Extract tasks from planning notes for "${p.label}" in ${YEAR}.

MONTH INDEX: Jan=0,Feb=1,Mar=2,Apr=3,May=4,Jun=5,Jul=6,Aug=7,Sep=8,Oct=9,Nov=10,Dec=11
QUARTER: Q1=month -1 quarter Q1, Q2=month -1 quarter Q2, Q3=month -1 quarter Q3, Q4=month -1 quarter Q4
No time mentioned = month -1 quarter Q1

Return ONLY a JSON array, no markdown:
[{"text":"concise task","month":3,"quarter":"Q2","pid":${pid}}]

Notes: ${text}`
      );
      const items = JSON.parse(raw.replace(/```json|```/g,"").trim());
      const existing = parsed[pid] || [];
      const existingTexts = new Set(existing.map(i => i.text.toLowerCase().trim()));
      const newItems = items
        .filter(i => !existingTexts.has(i.text.toLowerCase().trim()))
        .map(i => ({...i, id: Date.now()+Math.random(), weekAssigned:null, startDay:0, endDay:4}));
      const n = {...parsed, [pid]: [...existing, ...newItems]};
      setParsed(n);
      cloudSave("annual_parsed", n);
    } catch(e) {
      console.error(e);
      setAiError(err => ({...err, [pid]: window.location.hostname==="localhost"
        ? "AI unavailable locally — deploy to Netlify."
        : "AI parse failed. Try again."}));
    }
    setLoading(null);
  };

  const removeTask = (pid, id) => {
    const n = {...parsed, [pid]: (parsed[pid]||[]).filter(i => i.id !== id)};
    setParsed(n);
    cloudSave("annual_parsed", n);
  };

  const addManual = (pid, text) => {
    if (!text.trim()) return;
    const ni = {text: text.trim(), month:-1, quarter:"Q1", pid, id: Date.now()+Math.random(), weekAssigned:null, startDay:0, endDay:4};
    const n = {...parsed, [pid]: [...(parsed[pid]||[]), ni]};
    setParsed(n);
    cloudSave("annual_parsed", n);
  };

  return (
    <div>
      <SecHead title="Annual Command Center" sub="Write freely · Save · Parse with AI · Tasks appear below"/>
      {/* 3-column grid — all 7 cards always fully visible, no accordion */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:14}}>
        {PRIORITIES.map(p => {
          const items   = parsed[p.id] || [];
          const draft   = getDraft(p.id);
          const saved   = freeform[p.id] || "";
          const isDirty = draft !== saved && drafts[p.id] !== undefined;
          const isLoading = loading === p.id;
          const err = aiError[p.id];

          return (
            <div key={p.id} style={{
              background:"#fff",
              border:"0.5px solid #E5E7EB",
              borderTop:`3px solid ${p.color}`,
              borderRadius:10,
              padding:14,
              display:"flex",
              flexDirection:"column",
              gap:10,
            }}>
              {/* Stream header */}
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:p.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:p.color,flexShrink:0}}>{p.short}</div>
                <span style={{fontSize:14,fontWeight:700,color:"#111827",flex:1}}>{p.label}</span>
                {items.length>0 && <span style={{fontSize:13,color:p.color,background:p.bg,borderRadius:99,padding:"2px 8px",flexShrink:0}}>{items.length} tasks</span>}
              </div>

              {/* Freeform textarea — always visible, always editable */}
              <textarea
                value={draft}
                onChange={e => setDraft(p.id, e.target.value)}
                placeholder={`Write ${p.label} goals freely — mention months, quarters, or objectives…`}
                style={{
                  width:"100%",
                  minHeight:90,
                  fontSize:14,
                  padding:"8px 10px",
                  border:`1.5px solid ${isDirty ? p.color : "#E5E7EB"}`,
                  borderRadius:8,
                  outline:"none",
                  resize:"vertical",
                  fontFamily:"inherit",
                  boxSizing:"border-box",
                  color:"#374151",
                  lineHeight:1.6,
                  background:"#FAFAFA",
                  transition:"border-color 0.15s",
                }}
              />

              {/* Buttons row */}
              <div style={{display:"flex", gap:6}}>
                <button
                  onClick={() => saveFF(p.id)}
                  disabled={!isDirty}
                  style={{fontSize:14,padding:"5px 12px",background:isDirty?"#111827":"#F3F4F6",color:isDirty?"#fff":"#9CA3AF",border:"none",borderRadius:6,cursor:isDirty?"pointer":"not-allowed",fontFamily:"inherit",fontWeight:600,transition:"all 0.15s"}}>
                  Save
                </button>
                <button
                  onClick={() => cancelEdit(p.id)}
                  disabled={!isDirty}
                  style={{fontSize:14,padding:"5px 12px",background:"#F3F4F6",color:isDirty?"#374151":"#9CA3AF",border:"none",borderRadius:6,cursor:isDirty?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.15s"}}>
                  Cancel
                </button>
                <button
                  onClick={() => {if(!isLoading && saved.trim()) parseAI(p.id);}}
                  disabled={isLoading || !saved.trim()}
                  style={{flex:1,fontSize:14,padding:"5px 8px",background:isLoading||!saved.trim()?"#9CA3AF":p.color,color:"#fff",border:"none",borderRadius:6,cursor:isLoading||!saved.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:600,transition:"background 0.15s"}}>
                  {isLoading ? "⏳ Parsing…" : "✦ Parse with AI"}
                </button>
              </div>

              {/* AI error */}
              {err && !isLoading && (
                <div style={{fontSize:14,color:"#EF4444",marginTop:-4}}>{err}</div>
              )}

              {/* Parsed tasks — always visible */}
              <div style={{borderTop:"1px solid #F3F4F6", paddingTop:8}}>
                <div style={{fontSize:14,fontWeight:700,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6,textTransform:"uppercase"}}>Parsed tasks</div>
                {items.length===0 && (
                  <div style={{fontSize:13,color:"#D1D5DB",fontStyle:"italic"}}>No tasks yet</div>
                )}
                <div style={{display:"flex", flexDirection:"column", gap:4}}>
                  {items.map(item => (
                    <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:p.bg,borderRadius:6}}>
                      <span style={{fontSize:13,color:p.color,background:p.light,borderRadius:99,padding:"1px 7px",flexShrink:0,minWidth:28,textAlign:"center"}}>
                        {item.month===-1 ? item.quarter : MONTHS[item.month]}
                      </span>
                      <span style={{flex:1,fontSize:14,color:"#374151",lineHeight:1.4}}>{item.text}</span>
                      <button
                        onClick={() => removeTask(p.id, item.id)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:14,padding:0,lineHeight:1,flexShrink:0}}>×</button>
                    </div>
                  ))}
                </div>
                {/* Manual add */}
                <div style={{display:"flex", gap:6, marginTop:8}}>
                  <input
                    id={"ann-add-"+p.id}
                    placeholder="Add manually…"
                    style={{flex:1,fontSize:14,padding:"4px 8px",border:"1px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}
                    onKeyDown={e=>{
                      if(e.key==="Enter"&&e.target.value.trim()){
                        addManual(p.id, e.target.value);
                        e.target.value="";
                      }
                    }}
                  />
                  <button
                    onClick={()=>{
                      const inp=document.getElementById("ann-add-"+p.id);
                      if(inp?.value.trim()){ addManual(p.id,inp.value); inp.value=""; }
                    }}
                    style={{fontSize:14,padding:"4px 10px",background:"#111827",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                    + Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ITEMS 5-9: NEW Quarterly — fluid grid, date top-left, continuous bar ────────// ── QMonthCard — standalone component so it never remounts during drag ──────────
function QMonthCard({mi, parsed, updP, ql, calBars, barsForWeek, barStyle,
                     dragItemRef, dragItem, setDragItem,
                     dragBarId, setDragBarId,
                     onDropWeek, onDropToMonthList, startResize, deleteBar,
                     mergeTD, updM}) {
  const [hovRow,setHovRow]=useState(null);

  const buildRows=()=>{
    const dim=daysInMonth(YEAR,mi), fd=firstDayOfMonth(YEAR,mi);
    const cells=[];
    for(let i=0;i<fd;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);
    const rows=[];
    for(let r=0;r<cells.length/7;r++) rows.push(cells.slice(r*7,(r+1)*7));
    return rows;
  };

  const rows=buildRows();
  const mTasks=PRIORITIES.flatMap(p=>(parsed[p.id]||[]).map(t=>({...t,pid:p.id}))).filter(t=>t.month===mi);

  return (
    <div style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:12,overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:"#111827",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#F9FAFB"}}>{MONTH_FULL[mi]}</div>
        <div style={{fontSize:14,color:"#6B7280"}}>{mTasks.length} tasks · {Object.values(calBars).filter(b=>b.month===mi).length} sched</div>
      </div>
      {/* Calendar */}
      <div style={{padding:"10px 10px 8px",borderBottom:"1px solid #F3F4F6"}}>
        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
          {DAYS_S.map((d,i)=>(
            <div key={i} style={{fontSize:11,color:i>=5?"#D1D5DB":"#9CA3AF",paddingLeft:3,fontWeight:800,letterSpacing:"0.08em"}}>{d}</div>
          ))}
        </div>
        {/* Week rows — these are the drop targets */}
        {rows.map((row,ri)=>{
          const bars=barsForWeek(mi,ri);
          const isHov=hovRow===ri;
          if(!row.some(c=>c!==null)) return null;
          return (
            <div key={ri}
              onDragOver={e=>{e.preventDefault();e.stopPropagation();setHovRow(ri);}}
              onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHovRow(null);}}
              onDrop={e=>{e.preventDefault();e.stopPropagation();setHovRow(null);onDropWeek(e,mi,ri,rows);setDragBarId(null);}}
              style={{position:"relative",marginBottom:2,
                outline:isHov?"2px dashed #2563EB":"none",
                borderRadius:5,outlineOffset:1,
                minHeight:Math.max(40,24+bars.length*20),
              }}>
              {/* Date cells — pointerEvents:none so drag passes to parent */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,pointerEvents:"none"}}>
                {row.map((day,ci)=>(
                  <div key={ci} style={{
                    background:day&&ci<5?"#F9FAFB":day&&ci>=5?"#F3F4F6":"transparent",
                    borderRadius:4,
                    padding:"3px 3px 16px 3px",
                    border:day?"1px solid #F3F4F6":"none",
                    opacity:day&&ci>=5?0.4:1,
                    minHeight:36,
                    pointerEvents:"none",
                  }}>
                    <span style={{fontSize:13,fontWeight:500,color:"#6B7280",lineHeight:1,userSelect:"none"}}>{day||""}</span>
                  </div>
                ))}
              </div>
              {/* Task bars — absolutely positioned, pointerEvents:none so they don't block drops */}
              {bars.map((bar,barIndex)=>{
                const p=gp(bar.pid);
                return (
                  <div key={bar.id} style={{...barStyle(bar,p,barIndex),pointerEvents:"none",opacity:dragBarId===bar.id?0.4:1}}>
                    <div onMouseDown={e=>startResize(e,bar.id,"left")}
                      style={{width:5,height:"100%",background:p.color+"60",borderRadius:"3px 0 0 3px",cursor:"ew-resize",flexShrink:0,pointerEvents:"all"}}/>
                    <span
                      draggable
                      onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("action","moveBar");e.dataTransfer.setData("barId",bar.id);setDragBarId(bar.id);}}
                      onDragEnd={()=>setDragBarId(null)}
                      style={{fontSize:13,fontWeight:600,color:p.color,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"0 3px",lineHeight:1,cursor:"grab",pointerEvents:"all"}}>
                      {bar.text}
                    </span>
                    <button onClick={()=>deleteBar(bar.id)}
                      style={{background:"none",border:"none",cursor:"pointer",color:p.color,fontSize:12,padding:0,lineHeight:1,flexShrink:0,fontWeight:700,pointerEvents:"all"}}>×</button>
                    <div onMouseDown={e=>startResize(e,bar.id,"right")}
                      style={{width:5,height:"100%",background:p.color+"60",borderRadius:"0 3px 3px 0",cursor:"ew-resize",flexShrink:0,pointerEvents:"all"}}/>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {/* Month tasks below — draggable onto calendar */}
      {mTasks.length>0&&(
        <div style={{padding:"10px 10px"}}
          onDragOver={e=>{if(dragItemRef.current)e.preventDefault();}}
          onDrop={e=>onDropToMonthList(e,mi)}>
          <div style={{fontSize:14,fontWeight:800,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>DRAG TO SCHEDULE ↑</div>
          {mTasks.map(task=>{
            const p=gp(task.pid);
            const isScheduled=Object.values(calBars).some(b=>b.taskId===task.id&&b.month===mi);
            return (
              <div key={task.id} draggable
                onDragStart={e=>{
                  // Set ref immediately — state update is async and may be stale by drop time
                  dragItemRef.current=task;
                  setDragItem(task);
                  e.dataTransfer.setData("taskId",String(task.id));
                  e.dataTransfer.setData("action","newTask");
                  e.dataTransfer.effectAllowed="move";
                }}
                onDragEnd={()=>{setDragItem(null);dragItemRef.current=null;}}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 7px",marginBottom:3,borderRadius:6,
                  background:isScheduled?p.light+"99":p.light,
                  border:"1.5px solid "+p.color+"44",
                  cursor:"grab",userSelect:"none",
                  opacity:dragItem?.id===task.id?0.35:isScheduled?0.6:1}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{fontSize:15,color:p.color,flex:1,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.text}</span>
                {isScheduled&&<span style={{fontSize:15,color:p.color,fontWeight:600,flexShrink:0}}>✓</span>}
                <button onClick={e=>{e.stopPropagation();const n={...parsed};PRIORITIES.forEach(pr=>{if(n[pr.id])n[pr.id]=n[pr.id].filter(t=>t.id!==task.id);});updP(n);}}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:12,padding:0,lineHeight:1,flexShrink:0}}>×</button>
              </div>
            );
          })}
        </div>
      )}
      {/* Add task */}
      <div style={{padding:"0 10px 10px"}}>
        <div style={{display:"flex",gap:4}}>
          <input id={"q-add-"+mi} placeholder="Add task…"
            style={{flex:1,fontSize:14,padding:"5px 7px",border:"1px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}
            onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){const apid=PRIORITIES[0].id;const ni={text:e.target.value.trim(),month:mi,quarter:ql,pid:apid,id:Date.now()+Math.random(),weekAssigned:null,startDay:0,endDay:4};const n={...parsed,[apid]:[...(parsed[apid]||[]),ni]};updP(n);e.target.value="";}}}/>
          <button onClick={()=>{const inp=document.getElementById("q-add-"+mi);if(inp?.value.trim()){const apid=PRIORITIES[0].id;const ni={text:inp.value.trim(),month:mi,quarter:ql,pid:apid,id:Date.now()+Math.random(),weekAssigned:null,startDay:0,endDay:4};const n={...parsed,[apid]:[...(parsed[apid]||[]),ni]};updP(n);inp.value="";}}}
            style={{...bd,fontSize:12,padding:"5px 10px"}}>+</button>
        </div>
      </div>
    </div>
  );
}

// ── ITEMS 5-9: NEW Quarterly — fluid grid, date top-left, continuous bar ────────

function QuarterlyScreen({parsed,setParsed,mergeTD,setMergeTD}) {
  const [quarter,setQuarter]=useState(1);
  const [dragItem,setDragItem]=useState(null);  // task being dragged from task list
  const dragItemRef=useRef(null); // ref so onDrop always reads fresh value
  const [dropTarget,setDropTarget]=useState(null);
  // calBars: {barId: {taskId,month,weekRow,startDay,endDay,text,pid,weekLabel}}
  const [calBars,setCalBars]=useState(()=>lsGet("cal_bars",{}));
  const calBarsRef=useRef(calBars);
  useEffect(()=>{calBarsRef.current=calBars;},[calBars]);
  const [resizing,setResizing]=useState(null);
  const [dragBarId,setDragBarId]=useState(null); // bar being dragged between weeks

  const qm=Q_MONTHS[QUARTERS[quarter]], ql=QUARTERS[quarter];
  const all=PRIORITIES.flatMap(p=>(parsed[p.id]||[]).map(t=>({...t,pid:p.id})));
  // Quarter-wide: no month assigned
  const qLevel=all.filter(t=>(t.month===-1||t.month===undefined)&&(t.quarter===ql||!t.quarter));
  const monthTasks=m=>all.filter(t=>t.month===m);

  const updP=n=>{setParsed(n);cloudSave("annual_parsed",n);};
  const updM=n=>{setMergeTD(n);cloudSave("merge_td",n);};
  const saveCalBars=n=>{setCalBars(n);cloudSave("cal_bars",n);};

  // Build week rows: array of rows, each row = 7 cells (day number or null)
  const buildRows=mi=>{
    const dim=daysInMonth(YEAR,mi), fd=firstDayOfMonth(YEAR,mi);
    const cells=[];
    for(let i=0;i<fd;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);
    const rows=[];
    for(let r=0;r<cells.length/7;r++) rows.push(cells.slice(r*7,(r+1)*7));
    return rows;
  };

  // Bars for a given month+weekRow — reads calBars STATE (not ref) so renders immediately after drop
  const barsForWeek=(mi,ri)=>
    Object.entries(calBars)
      .filter(([,b])=>b.month===mi&&b.weekRow===ri)
      .map(([id,b])=>({id,...b}));

  // Drop task onto week row -> create bar Mon(0)-Fri(4)
  // Uses dragItemRef.current (not dragItem state) to avoid stale closure
  const onDropWeek=(e,mi,ri,rows)=>{
    e.preventDefault();
    // Handle bar-move drag
    const action=e.dataTransfer.getData("action");
    if(action==="moveBar"){
      const barId=e.dataTransfer.getData("barId");
      const bar=calBarsRef.current[barId]; if(!bar) return;
      const row=rows[ri];
      let newWl=null;
      if(row){const firstRealIdx=row.findIndex((c,ci)=>c!==null&&ci<5);const firstReal=firstRealIdx>=0?row[firstRealIdx]:null;if(firstReal)newWl=getWeekLabel(YEAR,mi,firstReal);}
      const n={...calBarsRef.current,[barId]:{...bar,month:mi,weekRow:ri,weekLabel:newWl,startDay:0,endDay:4}};
      saveCalBars(n);
      const w={...mergeTD};
      if(bar.weekLabel&&w[bar.weekLabel])w[bar.weekLabel]=w[bar.weekLabel].filter(t=>t.id!==bar.taskId);
      if(newWl&&!(w[newWl]||[]).find(t=>t.id===bar.taskId))w[newWl]=[...(w[newWl]||[]),{text:bar.text,pid:bar.pid,id:bar.taskId,fromAnnual:true}];
      updM(w);
      setDragBarId(null);return;
    }
    const item=dragItemRef.current;
    if(!item) return;
    const barId='bar_'+Date.now()+'_'+Math.random();
    const fresh=calBarsRef.current;
    // Compute week label for later restoration on delete
    const row=rows[ri];
    let wl=null;
    if(row){
      const firstRealIdx=row.findIndex((c,ci)=>c!==null&&ci<5);
      const firstReal=firstRealIdx>=0?row[firstRealIdx]:null;
      if(firstReal) wl=getWeekLabel(YEAR,mi,firstReal);
    }
    const n={...fresh,[barId]:{taskId:item.id,month:mi,weekRow:ri,startDay:0,endDay:4,text:item.text,pid:item.pid,weekLabel:wl}};
    saveCalBars(n);
    // Also push to mergeTD
    if(wl){
      const w={...mergeTD};
      if(!(w[wl]||[]).find(t=>t.id===item.id)){
        w[wl]=[...(w[wl]||[]),{text:item.text,pid:item.pid,id:item.id,fromAnnual:true}];
        updM(w);
      }
    }
    setDragItem(null);
    dragItemRef.current=null;
  };

  const deleteBar=barId=>{
    const bar=calBarsRef.current[barId];
    const n={...calBarsRef.current}; delete n[barId]; saveCalBars(n);
    if(bar?.weekLabel){
      const w={...mergeTD};
      if(w[bar.weekLabel]){w[bar.weekLabel]=w[bar.weekLabel].filter(t=>t.id!==bar.taskId);updM(w);}
    }
  };

  const startResize=(e,barId,edge)=>{
    e.preventDefault(); e.stopPropagation();
    const bar=calBarsRef.current[barId]; if(!bar) return;
    setResizing({barId,edge,startX:e.clientX,origStart:bar.startDay,origEnd:bar.endDay});
  };

  useEffect(()=>{
    if(!resizing) return;
    const onMove=e=>{
      const fresh=calBarsRef.current;
      const bar=fresh[resizing.barId]; if(!bar) return;
      const colW=36;
      const delta=Math.round((e.clientX-resizing.startX)/colW);
      let ns=resizing.origStart, ne=resizing.origEnd;
      if(resizing.edge==="left")  ns=Math.max(0,Math.min(resizing.origEnd,resizing.origStart+delta));
      if(resizing.edge==="right") ne=Math.max(resizing.origStart,Math.min(6,resizing.origEnd+delta));
      setCalBars({...fresh,[resizing.barId]:{...bar,startDay:ns,endDay:ne}});
    };
    const onUp=()=>{cloudSave("cal_bars",calBarsRef.current);setResizing(null);};
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
  },[resizing]);

  // barStyle: bar positioned absolutely; barIndex stacks multiple bars in same week
  const barStyle=(bar,p,barIndex=0)=>{
    const colW=100/7;
    const left=bar.startDay*colW;
    const width=(bar.endDay-bar.startDay+1)*colW;
    return {
      position:"absolute",
      bottom:3+barIndex*20,
      left:"calc("+left+"% + 1px)",
      width:"calc("+width+"% - 2px)",
      height:18,
      background:p.color+"28",
      border:"1.5px solid "+p.color,
      borderRadius:4,
      display:"flex",
      alignItems:"center",
      justifyContent:"space-between",
      padding:"0 3px",
      boxSizing:"border-box",
      zIndex:3,
      overflow:"visible",
    };
  };

  return (
    <div>
      <SecHead title="Quarterly Calendar" sub="Drag tasks onto a week · Resize bar ends · × to delete"/>
      {/* Quarter nav */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setQuarter(q=>Math.max(0,q-1))} style={nb}>◀</button>
        <span style={{fontSize:16,fontWeight:800,color:"#111827"}}>{ql} {YEAR}</span>
        <button onClick={()=>setQuarter(q=>Math.min(3,q+1))} style={nb}>▶</button>
      </div>

      {/* Quarter-wide tasks banner */}
      {qLevel.length>0&&(
        <div style={{background:dropTarget==="qzone"?"#EFF6FF":"#F8FAFF",border:dropTarget==="qzone"?"2px dashed #2563EB":"1.5px dashed #BFDBFE",borderRadius:10,padding:"12px 16px",marginBottom:20}}
          onDragOver={e=>{e.preventDefault();setDropTarget("qzone");}}
          onDragLeave={()=>setDropTarget(null)}
          onDrop={e=>{e.preventDefault();setDropTarget(null);}}>
          <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.1em",color:"#2563EB",marginBottom:8}}>{ql} — QUARTER-LEVEL (no specific month)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {qLevel.map(task=>{const p=gp(task.pid);return(
              <div key={task.id} draggable
                onDragStart={e=>{setDragItem(task);dragItemRef.current=task;e.dataTransfer.setData("action","newTask");}}
                onDragEnd={()=>{setDragItem(null);dragItemRef.current=null;setDropTarget(null);}}
                style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:7,background:p.light,border:"1.5px solid "+p.color+"44",cursor:"grab",userSelect:"none",opacity:dragItem?.id===task.id?0.35:1}}>
                <span style={{fontSize:14,color:p.color,opacity:0.5}}>⠿</span>
                <span style={{fontSize:14,color:p.color}}>{task.text}</span>
                <button onClick={e=>{e.stopPropagation();const n={...parsed};PRIORITIES.forEach(pr=>{if(n[pr.id])n[pr.id]=n[pr.id].filter(t=>t.id!==task.id);});updP(n);const w={...mergeTD};Object.keys(w).forEach(wk=>{w[wk]=(w[wk]||[]).filter(t=>t.id!==task.id);});updM(w);}}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:14,padding:0,lineHeight:1,marginLeft:2}}>×</button>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* 3 month cards — fluid equal-width grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14}}>
        {qm.map(m=>(
          <QMonthCard key={m} mi={m}
            parsed={parsed} updP={updP} ql={ql}
            calBars={calBars} barsForWeek={barsForWeek}
            barStyle={barStyle}
            dragItemRef={dragItemRef} dragItem={dragItem}
            setDragItem={setDragItem}
            dragBarId={dragBarId} setDragBarId={setDragBarId}
            onDropWeek={onDropWeek}
            onDropToMonthList={(e,mi)=>{
              e.preventDefault();
              const item=dragItemRef.current;
              if(!item) return;
              const n={...parsed};
              PRIORITIES.forEach(pr=>{if(n[pr.id])n[pr.id]=n[pr.id].map(t=>t.id===item.id?{...t,month:mi,quarter:ql}:t);});
              updP(n);
              setDragItem(null);dragItemRef.current=null;
            }}
            startResize={startResize} deleteBar={deleteBar}
            mergeTD={mergeTD} updM={updM}
          />
        ))}
      </div>

      {/* Unschedule drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDropTarget("ub");}}
        onDragLeave={()=>setDropTarget(null)}
        onDrop={e=>{
          e.preventDefault();setDropTarget(null);
          const action=e.dataTransfer.getData("action");
          if(action==="moveBar"){const barId=e.dataTransfer.getData("barId");deleteBar(barId);}
          setDragBarId(null);
        }}
        style={{marginTop:16,padding:"12px",borderRadius:10,textAlign:"center",background:dropTarget==="ub"?"#FEF2F2":"#FAFAF8",border:dropTarget==="ub"?"2px dashed #DC2626":"1.5px dashed #E5E7EB",fontSize:14,color:"#9CA3AF",fontStyle:"italic"}}>
        ↓ Drop a scheduled bar here to unschedule it
      </div>
    </div>
  );
}

// ── ITEMS 10-11: Weekly Merge ──────────────────────────────────────────────────
function WeeklyMergeScreen({mergeTD,setMergeTD,bottomUp,setBottomUp,buRaw,setBuRaw,isMobile}) {
  const [week,setWeek]=useState(0);
  const [aiLoad,setAiLoad]=useState(false);
  const [newText,setNewText]=useState("");
  const [newPid,setNewPid]=useState(1);
  const [tdEditId,setTdEditId]=useState(null);
  const [tdEditVal,setTdEditVal]=useState("");
  const [buEditId,setBuEditId]=useState(null);
  const [buEditVal,setBuEditVal]=useState("");
  const [buAiErr,setBuAiErr]=useState(false);
  const rawRef=useRef(null);
  const [leftPct,setLeftPct]=useState(50);
  const splitRef=useRef(null);
  const draggingRef=useRef(false);
  const wk=WEEK_DATES[week];
  const td=mergeTD[wk]||[], bu=bottomUp[wk]||[];

  const addTD=()=>{
    if(!newText.trim()) return;
    const n={...mergeTD,[wk]:[...td,{text:newText,pid:newPid,id:Date.now(),fromAnnual:false}]};
    setMergeTD(n); cloudSave("merge_td",n); setNewText("");
  };

  // ITEM 10: Deduplication fix
  const parseBU=async()=>{
    const raw=buRaw[wk]||""; if(!raw.trim()) return;
    setAiLoad(true); setBuAiErr(false);
    try {
      const resp=await callAI(`Convert rough notes into clean action items (under 12 words). Assign pid: ${PRIORITIES.map(p=>`${p.id}=${p.label}`).join(", ")}. Return ONLY JSON:\n[{"text":"item","pid":1}]\nNotes: ${raw}`);
      const items=JSON.parse(resp.replace(/```json|```/g,"").trim());
      const existing=bottomUp[wk]||[];
      const existingTexts=new Set(existing.map(i=>i.text.toLowerCase().trim()));
      const newItems=items
        .filter(i=>!existingTexts.has(i.text.toLowerCase().trim()))
        .map(i=>({...i,id:Date.now()+Math.random(),done:false}));
      const n={...bottomUp,[wk]:[...existing,...newItems]};
      setBottomUp(n); cloudSave("merge_bu",n);
    } catch(e){console.error(e);setBuAiErr(true);}
    setAiLoad(false);
  };

  const toggleBU=id=>{const n={...bottomUp,[wk]:bu.map(i=>i.id===id?{...i,done:!i.done}:i)};setBottomUp(n);cloudSave("merge_bu",n);};
  const saveBuEdit=item=>{if(!buEditVal.trim()){setBuEditId(null);return;}const n={...bottomUp,[wk]:bu.map(t=>t.id===item.id?{...t,text:buEditVal}:t)};setBottomUp(n);cloudSave("merge_bu",n);setBuEditId(null);};
  const saveTdEdit=item=>{if(!tdEditVal.trim()){setTdEditId(null);return;}const n={...mergeTD,[wk]:td.map(t=>t.id===item.id?{...t,text:tdEditVal}:t)};setMergeTD(n);cloudSave("merge_td",n);setTdEditId(null);};
  const delItem=item=>{
    if(td.find(t=>t.id===item.id)){const n={...mergeTD,[wk]:td.filter(t=>t.id!==item.id)};setMergeTD(n);cloudSave("merge_td",n);}
    else{const n={...bottomUp,[wk]:bu.filter(t=>t.id!==item.id)};setBottomUp(n);cloudSave("merge_bu",n);}
  };

  return (
    <div>
      <SecHead title="Weekly Merge" sub="Top-down + bottom-up → this week's plan"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <WNav week={week} setWeek={w=>{setWeek(w);setBuEditId(null);setBuEditVal("");setTdEditId(null);setTdEditVal("");}}/>
        <PBtn label="Connect Outlook / Teams" icon="🔗"/>
      </div>
      {/* ITEM 15: Mobile responsive grid — resizable split */}
      <div ref={splitRef} style={{display:isMobile?"flex":"flex",flexDirection:isMobile?"column":"row",gap:0,alignItems:"stretch"}}>
        {/* Email / Verbal — LEFT */}
        <div style={{flex:isMobile?"1 1 auto":`0 0 calc(${leftPct}% - 6px)`,minWidth:200,background:"#fff",border:"1.5px solid #FEF3C7",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.12em",color:"#D97706",marginBottom:10}}>↑ FROM EMAIL / VERBAL</div>
          <textarea ref={rawRef} value={buRaw[wk]||""}
            onChange={e=>{const n={...buRaw,[wk]:e.target.value};setBuRaw(n);cloudSave("merge_bu_raw",n);}}
            placeholder="Paste emails or type tasks…"
            style={{width:"100%",minHeight:150,fontSize:15,border:"1.5px solid #FDE68A",borderRadius:8,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.6}}/>
          <button onClick={parseBU} disabled={aiLoad} style={{marginTop:8,...bd,background:aiLoad?"#9CA3AF":"#D97706",cursor:aiLoad?"not-allowed":"pointer"}}>{aiLoad?"⏳ Parsing…":"✦ AI → Clean Task List"}</button>
          {buAiErr&&!aiLoad&&<div style={{fontSize:14,color:"#EF4444",marginTop:6}}>AI failed. Try again or add items manually.</div>}
          {bu.length>0&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>PARSED TASKS</div>
              <div style={{maxHeight:400,overflowY:"auto",paddingRight:4}}>
                {bu.map(item=>{const isEd=buEditId===item.id;return(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",marginBottom:3,borderRadius:6,background:item.done?"#F9FAFB":"#F8FAFF",border:`1px solid ${item.done?"#E5E7EB":"#DBEAFE"}`}}>
                    <input type="checkbox" checked={!!item.done} onChange={()=>toggleBU(item.id)} style={{cursor:"pointer",flexShrink:0}}/>
                    {isEd?(
                      <input autoFocus value={buEditVal} onChange={e=>setBuEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveBuEdit(item);if(e.key==="Escape")setBuEditId(null);}} style={{flex:1,fontSize:15,padding:"3px 6px",border:"1.5px solid #2563EB",borderRadius:4,outline:"none",fontFamily:"inherit"}}/>
                    ):(
                      <span onDoubleClick={()=>{setBuEditId(item.id);setBuEditVal(item.text);}} style={{fontSize:15,flex:1,color:item.done?"#9CA3AF":"#374151",textDecoration:item.done?"line-through":"none",cursor:"text"}}>{item.text}</span>
                    )}
                    {isEd?(<button onClick={()=>saveBuEdit(item)} style={{...bd,fontSize:13,padding:"2px 8px"}}>✓</button>):(
                      <button onClick={()=>{const n={...bottomUp,[wk]:bu.filter(i=>i.id!==item.id)};setBottomUp(n);cloudSave("merge_bu",n);}} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:15,padding:0,lineHeight:1}}>×</button>
                    )}
                  </div>
                );})}
              </div>
              <div style={{display:"flex",gap:6,marginTop:8}}>
                <input id={`bu-add-${wk}`} placeholder="Add item manually…" style={{flex:1,fontSize:15,padding:"5px 8px",border:"1px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}
                  onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){const ni={text:e.target.value.trim(),pid:1,id:Date.now()+Math.random(),done:false};const n={...bottomUp,[wk]:[...bu,ni]};setBottomUp(n);cloudSave("merge_bu",n);e.target.value="";}}}/>
                <button onClick={()=>{const inp=document.getElementById(`bu-add-${wk}`);if(inp?.value.trim()){const ni={text:inp.value.trim(),pid:1,id:Date.now()+Math.random(),done:false};const n={...bottomUp,[wk]:[...bu,ni]};setBottomUp(n);cloudSave("merge_bu",n);inp.value="";}}} style={{...bd,fontSize:14,padding:"5px 10px"}}>+ Add</button>
              </div>
            </div>
          )}
          {bu.length===0&&(
            <div style={{marginTop:12}}>
              <div style={{display:"flex",gap:6}}>
                <input id={`bu-add-${wk}`} placeholder="Add item manually…" style={{flex:1,fontSize:15,padding:"5px 8px",border:"1px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}
                  onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){const ni={text:e.target.value.trim(),pid:1,id:Date.now()+Math.random(),done:false};const n={...bottomUp,[wk]:[ni]};setBottomUp(n);cloudSave("merge_bu",n);e.target.value="";}}}/>
                <button onClick={()=>{const inp=document.getElementById(`bu-add-${wk}`);if(inp?.value.trim()){const ni={text:inp.value.trim(),pid:1,id:Date.now()+Math.random(),done:false};const n={...bottomUp,[wk]:[ni]};setBottomUp(n);cloudSave("merge_bu",n);inp.value="";}}} style={{...bd,fontSize:14,padding:"5px 10px"}}>+ Add</button>
              </div>
            </div>
          )}
        </div>
        {/* Drag divider */}
        {!isMobile&&<div
          style={{width:12,cursor:"col-resize",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,userSelect:"none"}}
          onMouseDown={e=>{
            e.preventDefault();
            draggingRef.current=true;
            const container=splitRef.current;
            const onMove=mv=>{
              if(!draggingRef.current) return;
              const rect=container.getBoundingClientRect();
              const pct=Math.min(80,Math.max(20,((mv.clientX-rect.left)/rect.width)*100));
              setLeftPct(pct);
            };
            const onUp=()=>{draggingRef.current=false;window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
            window.addEventListener("mousemove",onMove);
            window.addEventListener("mouseup",onUp);
          }}>
          <div style={{width:3,height:40,borderRadius:3,background:"#D1D5DB"}}/>
        </div>}
        {/* Annual Plan — RIGHT */}
        <div style={{flex:"1 1 0",minWidth:200,background:"#fff",border:"1.5px solid #E0E7FF",borderRadius:10,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.12em",color:"#2563EB",marginBottom:10}}>↓ FROM ANNUAL PLAN</div>
          {td.length===0&&<div style={{fontSize:15,color:"#ccc",fontStyle:"italic",marginBottom:10}}>Drag tasks from Quarterly Calendar to populate, or add below.</div>}
          {td.map(item=>{const p=gp(item.pid),isEd=tdEditId===item.id;return(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #F3F4F6"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:p?.color,flexShrink:0}}/>
              {isEd?(
                <input autoFocus value={tdEditVal} onChange={e=>setTdEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveTdEdit(item);if(e.key==="Escape")setTdEditId(null);}} style={{flex:1,fontSize:15,padding:"3px 6px",border:"1.5px solid #2563EB",borderRadius:4,outline:"none",fontFamily:"inherit"}}/>
              ):(
                <span onDoubleClick={()=>{setTdEditId(item.id);setTdEditVal(item.text);}} style={{fontSize:15,flex:1,color:"#374151",cursor:"text"}}>{item.text}</span>
              )}
              {isEd?(<button onClick={()=>saveTdEdit(item)} style={{...bd,fontSize:13,padding:"2px 8px"}}>✓</button>):(
                <button onClick={()=>delItem(item)} style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E1",fontSize:15,padding:0,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#CBD5E1"}>×</button>
              )}
            </div>
          );})}
          <div style={{display:"flex",gap:6,marginTop:12}}>
            <input value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTD()} placeholder="Add more…" style={{flex:1,fontSize:15,padding:"6px 9px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={addTD} style={bd}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ITEMS 12-14: Timetable — ALL original functionality preserved ──────────────
function TimetableScreen({mergeTD,gridBlocks,setGridBlocks,extraTasks,setExtraTasks,scheduledIds,setScheduledIds,isMobile}) {
  const [week,setWeek]=useState(0);
  const [dragTask,setDragTask]=useState(null);
  const [newExtra,setNewExtra]=useState("");
  const [inlineEdit,setInlineEdit]=useState(null);
  const [inlineVal,setInlineVal]=useState("");
  const [panelEditId,setPanelEditId]=useState(null);
  const [panelEditVal,setPanelEditVal]=useState("");
  const [taskPriorities,setTaskPriorities]=useState(()=>lsGet("tt_priorities",{}));
  const [panelOrder,setPanelOrder]=useState(()=>lsGet("tt_panel_order",null));
  const [dragPanelIdx,setDragPanelIdx]=useState(null);
  const [dragOverIdx,setDragOverIdx]=useState(null);
  const wk=WEEK_DATES[week];
  const compact=isMobile||window.innerWidth<1100;
  const td=mergeTD[wk]||[], bu=(lsGet("merge_bu",{})[wk]||[]).filter(i=>!i.done);
  // ITEM 14: 300px panel width (50% wider)
  const panel=[...td,...bu,...extraTasks];
  const orderedPanel=useMemo(()=>{
    if(!panelOrder) return panel;
    return [...panel].sort((a,b)=>{
      const ai=panelOrder.indexOf(a.id), bi=panelOrder.indexOf(b.id);
      if(ai===-1&&bi===-1) return 0; if(ai===-1) return 1; if(bi===-1) return -1;
      return ai-bi;
    });
  },[panel,panelOrder]);

  const cyclePriority=(taskId)=>{
    const cur=taskPriorities[taskId]||0;
    const next=cur>=3?0:cur+1;
    const n={...taskPriorities,[taskId]:next};
    setTaskPriorities(n);cloudSave("tt_priorities",n);
  };

  const reorderPanel=(fromIdx,toIdx)=>{
    if(fromIdx===toIdx||toIdx==null) return;
    const ids=orderedPanel.map(t=>t.id);
    const [moved]=ids.splice(fromIdx,1);
    ids.splice(toIdx,0,moved);
    setPanelOrder(ids);cloudSave("tt_panel_order",ids);
  };

  const PRIO_STYLES=[
    null,
    {bg:"#FEE2E2",color:"#DC2626",label:"P1"},
    {bg:"#FEF3C7",color:"#D97706",label:"P2"},
    {bg:"#DCFCE7",color:"#16A34A",label:"P3"},
  ];
  const ck=(day,si)=>`${wk}-${day}-${si}`;
  const [dragBlock,setDragBlock]=useState(null);

  const drop=(day,si)=>{
    const k=ck(day,si);
    if(dragBlock){
      if(dragBlock.key===k){setDragBlock(null);return;}
      const block=gridBlocks[dragBlock.key];
      if(!block){setDragBlock(null);return;}
      const n={...gridBlocks};
      const isSecondary=dragBlock.key.endsWith('__2');
      delete n[dragBlock.key];
      if(!isSecondary&&n[dragBlock.key+'__2']){n[dragBlock.key]=n[dragBlock.key+'__2'];delete n[dragBlock.key+'__2'];}
      const targetK=n[k]?k+'__2':k;
      if(n[targetK]){setDragBlock(null);return;}
      n[targetK]={...block};
      setGridBlocks(n);cloudSave("tt_blocks",n);setDragBlock(null);return;
    }
    if(!dragTask) return;
    const k2=k+'__2';
    const targetKey=gridBlocks[k]?k2:k;
    if(gridBlocks[targetKey]) return;
    const n={...gridBlocks,[targetKey]:{text:dragTask.text,pid:dragTask.pid,id:dragTask.id,slots:2,source:"manual",priority:taskPriorities[dragTask.id]||0}};
    setGridBlocks(n);cloudSave("tt_blocks",n);
    const s=[...new Set([...scheduledIds,dragTask.id])];setScheduledIds(s);cloudSave("tt_scheduled_ids",s);
    setDragTask(null);
  };

  const remBlock=k=>{
    const isSecondary=k.endsWith('__2');
    const primaryKey=isSecondary?k.replace('__2',''):k;
    const b=gridBlocks[k];
    if(b){
      const otherKey=isSecondary?primaryKey:k+'__2';
      const otherBlock=gridBlocks[otherKey];
      if(!otherBlock||otherBlock.id!==b.id){const s=scheduledIds.filter(id=>id!==b.id);setScheduledIds(s);cloudSave("tt_scheduled_ids",s);}
    }
    const n={...gridBlocks};
    if(!isSecondary&&n[k+'__2']){n[k]=n[k+'__2'];delete n[k+'__2'];}
    else{delete n[k];}
    setGridBlocks(n);cloudSave("tt_blocks",n);
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

  const savePanelEdit=(task)=>{
    if(!panelEditVal.trim()){setPanelEditId(null);return;}
    const n=extraTasks.map(t=>t.id===task.id?{...t,text:panelEditVal}:t);
    setExtraTasks(n);cloudSave("tt_extra",n);setPanelEditId(null);
  };

  // ITEM 12: Import from Copilot
  const [showImport,setShowImport]=useState(false);
  const [importText,setImportText]=useState("");
  const [importing,setImporting]=useState(false);
  const [importErr,setImportErr]=useState(false);

  const parseWithRegex=(text)=>{
    const lines=text.trim().split("\n").filter(l=>l.trim()&&!l.includes("---")&&!l.toLowerCase().startsWith("day"));
    const results=[];
    const dayMap={"mon":0,"tue":1,"wed":2,"thu":3,"fri":4};
    lines.forEach(line=>{
      let parts;
      if(line.includes("|")){parts=line.split("|").map(p=>p.trim()).filter(p=>p);}
      else{const m=line.match(/^(\S+\s+\S+)\s+(\d+:\d+\s*[ap]m)\s+(\d+:\d+\s*[ap]m)\s+(.+)/i);if(!m)return;parts=[m[1],m[2],m[3],m[4]];}
      if(parts.length<4) return;
      const [dayDate,startStr,endStr,...titleParts]=parts;
      const title=titleParts.join(" ").trim();
      const dayWord=dayDate.trim().split(/\s+/)[0].toLowerCase().slice(0,3);
      const di=dayMap[dayWord]; if(di===undefined) return;
      const parseTime=str=>{const m=str.trim().match(/(\d+):(\d+)\s*(am|pm)/i);if(!m)return null;let h=parseInt(m[1]),min=parseInt(m[2]);const ap=m[3].toLowerCase();if(ap==="pm"&&h!==12)h+=12;if(ap==="am"&&h===12)h=0;return h*60+min;};
      const startMins=parseTime(startStr), endMins=parseTime(endStr);
      if(startMins===null||endMins===null) return;
      const slotIndex=Math.round((startMins-7*60)/30);
      const slots=Math.max(1,Math.ceil((endMins-startMins)/30));
      if(slotIndex<0||slotIndex>=HOURS.length*2) return;
      results.push({day:DAYS[di],slotIndex,slots,text:title});
    });
    return results;
  };

  const importFromCopilot=async()=>{
    if(!importText.trim()) return;
    setImporting(true);
    try {
      let items=parseWithRegex(importText);
      if(items.length===0&&window.location.hostname!=="localhost"){
        try {
          const resp=await callAI(`Parse this calendar data into JSON. Return ONLY a raw JSON array:\n[{"day":"Mon","slotIndex":9,"slots":1,"text":"Meeting title"}]\nday=Mon/Tue/Wed/Thu/Fri\nslotIndex=(startHour-7)*2+(startMinute>=30?1:0)\nslots=ceil(durationMinutes/30)\nData:\n${importText}`);
          items=JSON.parse(resp.replace(/```json|```/g,"").trim());
        } catch(e){console.warn("AI fallback failed",e);}
      }
      if(items.length===0){setImporting(false);return;}
      const next={};
      Object.keys(gridBlocks).forEach(k=>{if(gridBlocks[k].source==="manual")next[k]=gridBlocks[k];});
      items.forEach(item=>{const k=ck(item.day,item.slotIndex);next[k]={text:item.text,pid:1,id:Date.now()+Math.random(),slots:Math.max(1,item.slots||1),source:"outlook"};});
      setGridBlocks(next);cloudSave("tt_blocks",next);
      const remainingIds=Object.values(next).filter(b=>b.source==="manual").map(b=>b.id);
      const newSched=scheduledIds.filter(id=>remainingIds.includes(id));
      setScheduledIds(newSched);cloudSave("tt_scheduled_ids",newSched);
      setShowImport(false);setImportText("");
    } catch(e){console.error(e);setImportErr(true);}
    setImporting(false);
  };

  // ITEM 12: Export ICS
  const exportICS=()=>{
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mihir Planner//EN","CALSCALE:GREGORIAN"];
    const weekIdx=WEEK_DATES.indexOf(wk);
    const baseDate=new Date(2026,4,4+weekIdx*7);
    DAYS.forEach((day,di)=>{
      const date=new Date(baseDate);date.setDate(baseDate.getDate()+di);
      const dateStr=date.toISOString().slice(0,10).replace(/-/g,"");
      for(let si=0;si<HOURS.length*2;si++){
        const b=gridBlocks[ck(day,si)];
        if(!b||b.source!=="manual") continue;
        const startHour=7+Math.floor(si/2), startMin=(si%2)*30;
        const endSi=si+(b.slots||1), endHour=7+Math.floor(endSi/2), endMin=(endSi%2)*30;
        const fmt=(h,m)=>`${String(h).padStart(2,"0")}${String(m).padStart(2,"0")}00`;
        lines.push("BEGIN:VEVENT",`DTSTART:${dateStr}T${fmt(startHour,startMin)}`,`DTEND:${dateStr}T${fmt(endHour,endMin)}`,`SUMMARY:${b.text}`,`UID:${Date.now()+Math.random()}@mihirplanner`,"END:VEVENT");
      }
    });
    lines.push("END:VCALENDAR");
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`week-${wk.replace(" ","-")}.ics`;a.click();URL.revokeObjectURL(url);
  };

  // ITEM 12: Export for iPad
  const print=()=>{
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Week of ${wk}</title><style>body{font-family:Georgia,serif;margin:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:5px;font-size:10px;vertical-align:top;height:18px;}th{background:#f5f5f5;font-weight:700;text-align:center;}.hr{color:#aaa;font-size:9px;text-align:right;width:36px;background:#fafafa;}@media print{@page{size:landscape;margin:10mm;}}</style></head><body>`);
    w.document.write(`<h2 style="font-size:15px">Week of ${wk} · ${YEAR}</h2><table><thead><tr><th class="hr"></th>`);
    DAYS.forEach(d=>w.document.write(`<th>${d}</th>`));
    w.document.write("</tr></thead><tbody>");
    HOURS.forEach(h=>[0,1].forEach(half=>{
      const si=(h-7)*2+half;
      w.document.write(`<tr><td class="hr">${half?":30":h<12?h+"am":h===12?"12pm":(h-12)+"pm"}</td>`);
      DAYS.forEach(d=>{const b=gridBlocks[ck(d,si)];w.document.write(`<td>${b?b.text:""}</td>`);});
      w.document.write("</tr>");
    }));
    w.document.write("</tbody></table></body></html>");
    w.document.close();w.print();
  };

  const occ={};
  DAYS.forEach(day=>{for(let si=0;si<HOURS.length*2;si++){
    const b=gridBlocks[ck(day,si)];if(b)for(let s=1;s<b.slots;s++)occ[`${day}-${si+s}`]=si;
    const b2=gridBlocks[ck(day,si)+'__2'];if(b2)for(let s=1;s<b2.slots;s++)occ[`${day}-${si+s}`]=si;
  }});

  return (
    <div>
      <SecHead title="Hour-by-Hour Timetable" sub="Drag tasks · Resize blocks · Click empty cell to add"/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <WNav week={week} setWeek={w=>{setWeek(w);setPanelEditId(null);setPanelEditVal("");setInlineEdit(null);setDragBlock(null);setDragTask(null);}}/>
        {/* ITEM 12: All 3 buttons preserved */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowImport(true)} style={{...bd,background:"#0078D4"}}>📥 Import from Copilot</button>
          <button onClick={exportICS} style={{...bd,background:"#059669"}}>📤 Export to Outlook (.ics)</button>
          <button onClick={print} style={bd}>⎙ Export for iPad</button>
        </div>
      </div>

      {showImport&&(
        <div style={{background:"#F0F7FF",border:"1.5px solid #BFDBFE",borderRadius:12,padding:"20px",marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1D4ED8",marginBottom:6}}>📥 Import from Copilot</div>
          <div style={{fontSize:13,color:"#3B82F6",marginBottom:12,lineHeight:1.6}}>
            Ask Copilot: <em>"List all my calendar meetings for this week. For each: day, start time, end time, and title only."</em> Then paste below.
          </div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)}
            placeholder={"Paste Copilot calendar output here…\n\nMon 5/4  11:30 AM  11:55 AM  Fleet level AI powered insights\n…"}
            style={{width:"100%",minHeight:160,fontSize:14,border:"1.5px solid #93C5FD",borderRadius:8,padding:"10px 12px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.6}}/>
          <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
            <button onClick={()=>{setImportErr(false);importFromCopilot();}} disabled={importing}
              style={{...bd,background:importing?"#9CA3AF":"#0078D4",cursor:importing?"not-allowed":"pointer"}}>
              {importing?"⏳ Importing…":"📥 Place on Timetable"}
            </button>
            <button onClick={()=>{setShowImport(false);setImportText("");setImportErr(false);}} style={bg}>Cancel</button>
            {importErr&&!importing&&<span style={{fontSize:14,color:"#EF4444"}}>Import failed. Check format and try again.</span>}
          </div>
        </div>
      )}

      {(dragTask||dragBlock)&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#EFF6FF",border:"1.5px solid #2563EB",borderRadius:8,marginBottom:10,fontSize:14}}>
          <span style={{color:"#2563EB",fontWeight:700,flex:1}}>
            {dragTask?`"${dragTask.text}" selected — tap a time slot to place it`:"Block selected — tap a time slot to move it"}
          </span>
          <button onClick={()=>{setDragTask(null);setDragBlock(null);}} style={{background:"none",border:"1px solid #2563EB",borderRadius:4,padding:"3px 10px",color:"#2563EB",cursor:"pointer",fontSize:13,fontFamily:"inherit",flexShrink:0}}>✕ Cancel</button>
        </div>
      )}
      <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
        {/* ITEM 13+14: Left panel 300px with × delete */}
        <div style={{width:isMobile?"100%":300,flexShrink:0}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            THIS WEEK'S TASKS
            <button onClick={()=>{setExtraTasks([]);cloudSave("tt_extra",[]);}} style={{fontSize:14,padding:"2px 6px",background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:4,cursor:"pointer",color:"#9CA3AF",fontFamily:"inherit"}}>Clear</button>
          </div>
          <div style={{fontSize:13,color:"#9CA3AF",marginBottom:8,fontStyle:"italic"}}>Drag onto grid → &nbsp;·&nbsp; or tap task then tap slot</div>
          {orderedPanel.map((task,idx)=>{
            const p=gp(task.pid), isSched=scheduledIds.includes(task.id), isExtra=!!extraTasks.find(t=>t.id===task.id), isEd=panelEditId===task.id;
            const prioLevel=taskPriorities[task.id]||0;
            const prioStyle=PRIO_STYLES[prioLevel];
            const isDragOver=dragOverIdx===idx&&dragPanelIdx!==null&&dragPanelIdx!==idx;
            return(
              <div key={task.id}
                onDragOver={e=>{if(dragPanelIdx!==null){e.preventDefault();setDragOverIdx(idx);}}}
                onDrop={e=>{if(dragPanelIdx!==null){e.preventDefault();reorderPanel(dragPanelIdx,idx);setDragPanelIdx(null);setDragOverIdx(null);}}}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 7px",marginBottom:3,borderRadius:6,background:isSched?"#F9FAFB":p?.light||"#F0FDF4",border:`1.5px solid ${isDragOver?"#2563EB":isSched?"#E5E7EB":p?.color+"44"||"#D1FAE5"}`,userSelect:"none",boxShadow:isDragOver?"0 0 0 2px #2563EB33":"none",opacity:dragPanelIdx===idx?0.4:1}}>
                {/* Drag-to-reorder handle */}
                {!isEd&&<span
                  draggable
                  onDragStart={e=>{e.stopPropagation();setDragPanelIdx(idx);setDragTask(null);}}
                  onDragEnd={()=>{setDragPanelIdx(null);setDragOverIdx(null);}}
                  title="Drag to reorder"
                  style={{fontSize:12,opacity:0.35,color:p?.color,cursor:"grab",flexShrink:0}}>⠿</span>}
                {/* Priority badge */}
                {!isEd&&<button
                  onClick={e=>{e.stopPropagation();cyclePriority(task.id);}}
                  title="Click to set priority"
                  style={{flexShrink:0,width:22,height:22,borderRadius:"50%",border:`1.5px solid ${prioStyle?prioStyle.color+"88":"#D1D5DB"}`,background:prioStyle?prioStyle.bg:"#F3F4F6",color:prioStyle?prioStyle.color:"#9CA3AF",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>
                  {prioStyle?prioStyle.label:"·"}
                </button>}
                {isEd?(
                  <input autoFocus value={panelEditVal} onChange={e=>setPanelEditVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")savePanelEdit(task);if(e.key==="Escape")setPanelEditId(null);}}
                    style={{flex:1,fontSize:14,padding:"2px 6px",border:"1.5px solid #2563EB",borderRadius:4,outline:"none",fontFamily:"inherit"}}/>
                ):(
                  <span draggable={!isSched} onDragStart={e=>{if(!isSched){e.stopPropagation();setDragTask(task);setDragPanelIdx(null);}}} onDragEnd={()=>setDragTask(null)}
                    onDoubleClick={()=>{if(isExtra){setPanelEditId(task.id);setPanelEditVal(task.text);}}}
                    onTouchEnd={e=>{if(!isSched){e.preventDefault();setDragTask(dragTask?.id===task.id?null:task);}}}
                    style={{fontSize:15,flex:1,lineHeight:1.3,color:isSched?"#9CA3AF":dragTask?.id===task.id?"#2563EB":p?.color||"#374151",textDecoration:isSched?"line-through":"none",fontWeight:dragTask?.id===task.id?800:"inherit",cursor:isSched?"default":isExtra?"text":"grab",opacity:dragTask?.id===task.id?0.7:1}}>{task.text}</span>
                )}
                {/* ITEM 13: × delete — hidden when task is scheduled on grid */}
                {isEd?(
                  <button onClick={()=>savePanelEdit(task)} style={{...bd,fontSize:14,padding:"2px 6px"}}>✓</button>
                ):(!isSched&&(
                  <button onClick={e=>{
                    e.stopPropagation();
                    if(isExtra){
                      const n=extraTasks.filter(t=>t.id!==task.id);
                      setExtraTasks(n);cloudSave("tt_extra",n);
                    }
                  }}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:14,padding:0,lineHeight:1,flexShrink:0}}>×</button>
                ))}
              </div>
            );
          })}
          <div style={{marginTop:10,borderTop:"1px solid #F3F4F6",paddingTop:10}}>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:6}}>ADD TASK</div>
            <input value={newExtra} onChange={e=>setNewExtra(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addExtra()} placeholder="Task name…" style={{width:"100%",fontSize:14,padding:"5px 8px",border:"1.5px solid #E5E7EB",borderRadius:6,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:5}}/>
            <button onClick={addExtra} style={{...bd,width:"100%",fontSize:14,padding:"5px 0"}}>+ Add to panel</button>
          </div>
        </div>

        {/* Grid */}
        {!isMobile&&(
          <div style={{flex:1,overflowX:"auto",width:"100%",minWidth:500}}>
            <div style={{display:"grid",gridTemplateColumns:"56px repeat(5,1fr)",borderBottom:"1px solid #E5E7EB",background:"#F9FAFB"}}>
              <div/>
              {DAYS.map(d=><div key={d} style={{padding:"8px 0",textAlign:"center",fontSize:13,fontWeight:800,color:"#374151",letterSpacing:"0.08em"}}>{d}</div>)}
            </div>
            <div style={{position:"relative"}}>
              {HOURS.map(h=>(
                <div key={h} style={{position:"absolute",top:(h-7)*CELL_H*2,left:0,right:0,borderTop:"1px solid #D1D5DB",zIndex:2,pointerEvents:"none"}}>
                  <span style={{position:"absolute",top:-9,left:4,fontSize:12,fontWeight:700,color:"#374151",background:"#fff",paddingRight:4,lineHeight:1}}>
                    {h<12?`${h}am`:h===12?"12pm":`${h-12}pm`}
                  </span>
                </div>
              ))}
              {HOURS.map(h=>(
                <div key={`${h}h`} style={{position:"absolute",top:(h-7)*CELL_H*2+CELL_H,left:56,right:0,borderTop:"1px solid #F3F4F6",zIndex:1,pointerEvents:"none"}}/>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"56px repeat(5,1fr)",height:HOURS.length*CELL_H*2}}>
                <div/>
                {DAYS.map(day=>(
                  <div key={day} data-day={day} style={{position:"relative",borderLeft:"1px solid #E5E7EB"}}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={e=>{e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();const offsetY=dragBlock?.offsetY||0;const si=Math.max(0,Math.min(HOURS.length*2-1,Math.round((e.clientY-rect.top-offsetY)/CELL_H)));drop(day,si);}}>

                    {HOURS.map(h=>[0,1].map(half=>{
                      const si=(h-7)*2+half;
                      const k=ck(day,si);
                      const block=gridBlocks[k];
                      const occBy=occ[`${day}-${si}`];
                      const isEd=inlineEdit===k;
                      if(occBy!==undefined) return null;
                      if(block){
                        const p=gp(block.pid);
                        const block2=gridBlocks[k+'__2'];
                        const p2=block2?gp(block2.pid):null;
                        const blockEl=(blk,bp,bk,left,right)=>(
                          <div key={bk} draggable
                            onDragStart={e=>{e.stopPropagation();const offsetY=e.clientY-e.currentTarget.getBoundingClientRect().top;setDragBlock({key:bk,day,si,offsetY});}}
                            onDragEnd={()=>setDragBlock(null)}
                            onTouchEnd={e=>{e.stopPropagation();setDragBlock(dragBlock?.key===bk?null:{key:bk,day,si,touch:true});}}
                            style={{position:"absolute",top:si*CELL_H+2,left,right,height:blk.slots*CELL_H-4,background:dragBlock?.key===bk?"#DBEAFE":bp?.light||"#EFF6FF",border:`1.5px solid ${dragBlock?.key===bk?"#2563EB":bp?.color||"#2563EB"}`,borderRadius:4,padding:"3px 6px",cursor:"grab",zIndex:3,display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",opacity:dragBlock?.key===bk?0.7:1,boxSizing:"border-box"}}>
                            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:4}}>
                              <span style={{fontSize:compact?12:14,color:bp?.color||"#2563EB",fontWeight:700,lineHeight:1.3,flex:1,overflow:"hidden"}}>{blk.text}</span>
                              <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                                {(()=>{const pl=taskPriorities[blk.id]||blk.priority||0;const ps=PRIO_STYLES[pl];return ps?<span style={{fontSize:7,fontWeight:800,color:ps.color,background:ps.bg,border:`1px solid ${ps.color}88`,borderRadius:10,padding:"1px 4px",lineHeight:1}}>{ps.label}</span>:null;})()}
                                <button onClick={e=>{e.stopPropagation();remBlock(bk);}} style={{background:"none",border:"none",cursor:"pointer",color:bp?.color||"#2563EB",fontSize:14,padding:0,opacity:0.6}}>×</button>
                              </div>
                            </div>
                            {blk.slots>=2&&<div style={{fontSize:compact?11:13,color:bp?.color||"#2563EB",opacity:0.7}}>{blk.slots*30}min</div>}
                            <div style={{position:"absolute",bottom:0,left:0,right:0,height:6,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center"}}
                              onMouseDown={e=>{
                                e.preventDefault();e.stopPropagation();
                                const sy=e.clientY,os=blk.slots;
                                const mv=mv2=>{const ns=Math.max(1,Math.min(16,os+Math.round((mv2.clientY-sy)/CELL_H)));const n={...gridBlocks,[bk]:{...blk,slots:ns}};setGridBlocks(n);cloudSave("tt_blocks",n);};
                                const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
                                window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
                              }}>
                              <div style={{width:24,height:2,borderRadius:2,background:bp?.color||"#2563EB",opacity:0.35}}/>
                            </div>
                          </div>
                        );
                        return (
                          <Fragment key={si}>{blockEl(block,p,k,2,block2?"50%":2)}{block2&&blockEl(block2,p2,k+'__2',"50%",2)}</Fragment>
                        );
                      }
                      return (
                        <div key={si}
                          onClick={()=>{if(dragTask||dragBlock){drop(day,si);return;}setPanelEditId(null);!inlineEdit&&(setInlineEdit(k),setInlineVal(""));}}
                          style={{position:"absolute",top:si*CELL_H,left:0,right:0,height:CELL_H,cursor:(dragTask||dragBlock)?"crosshair":"pointer",zIndex:0}}>
                          {isEd&&(
                            <div onClick={e=>e.stopPropagation()} style={{padding:"2px 4px",zIndex:10,position:"relative",background:"#fff"}}>
                              <input autoFocus value={inlineVal} onChange={e=>setInlineVal(e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter")saveInline(day,si);if(e.key==="Escape")setInlineEdit(null);}}
                                placeholder="Task…" style={{width:"100%",fontSize:13,border:"1px solid #2563EB",borderRadius:3,padding:"2px 4px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                              <button onClick={()=>saveInline(day,si)} style={{marginTop:2,fontSize:14,padding:"1px 6px",background:"#111827",color:"#fff",border:"none",borderRadius:3,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                            </div>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {isMobile&&(
          <div style={{flex:1,background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:14,textAlign:"center",color:"#9CA3AF",fontSize:13}}>
            Timetable grid available on desktop/tablet. Tasks listed above.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Retro (unchanged from App21) ──────────────────────────────────────────────
const SC=label=>{const p=PRIORITIES.find(p=>p.label===label);return p?.color||"#6B7280";};
const SL=label=>{const p=PRIORITIES.find(p=>p.label===label);return p?.light||"#F3F4F6";};

function RetroCard({item,sectionKey,borderColor,editingId,setEditingId,editVal,setEditVal,onSave,onDelete}) {
  const isEd=editingId===item.id;
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",marginBottom:5,borderRadius:8,background:"#F9FAFB",border:"1px solid #E5E7EB"}}>
      <span style={{fontSize:12,marginTop:2,color:borderColor,flexShrink:0}}>{borderColor==="#059669"?"✓":borderColor==="#DC2626"?"○":"→"}</span>
      <div style={{flex:1}}>
        {isEd?(
          <div>
            <textarea autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==="Escape"&&setEditingId(null)}
              style={{width:"100%",minHeight:70,fontSize:14,padding:"6px 8px",border:`1.5px solid ${borderColor}`,borderRadius:6,outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",lineHeight:1.6,color:"#374151"}}/>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <button onClick={onSave} style={{...bd,fontSize:14,padding:"3px 10px"}}>Save</button>
              <button onClick={()=>setEditingId(null)} style={{...bg,fontSize:14,padding:"3px 10px"}}>Cancel</button>
            </div>
          </div>
        ):(
          <span onClick={()=>{setEditingId(item.id);setEditVal(item.text);}} style={{fontSize:15,color:"#374151",lineHeight:1.5,cursor:"text",display:"block"}}>{item.text}</span>
        )}
      </div>
      <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#D1D5DB",fontSize:15,padding:0,lineHeight:1,alignSelf:"flex-start",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#EF4444"} onMouseLeave={e=>e.currentTarget.style.color="#D1D5DB"}>×</button>
    </div>
  );
}

function RetroScreen({rawNotes,setRawNotes,organized,setOrganized}) {
  const [week,setWeek]=useState(0);
  const [loading,setLoading]=useState(false);
  const [retroErr,setRetroErr]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [leftPct,setLeftPct]=useState(50);
  const splitRef=useRef(null);
  const draggingRef=useRef(false);
  const wk=WEEK_DATES[week];

  const organize=async()=>{
    const raw=rawNotes[wk]||""; if(!raw.trim()) return;
    setLoading(true);setRetroErr(false);
    try {
      const resp=await callAI(`Organize weekly notes into a retro. Return ONLY JSON:\n{"got_done":[{"text":"item"}],"not_done":[{"text":"item"}],"lessons":[{"text":"lesson"}]}\nNotes: ${raw}`);
      const p=JSON.parse(resp.replace(/```json|```/g,"").trim());
      const ai=arr=>(arr||[]).map(i=>({...i,id:Date.now()+Math.random()}));
      const n={...organized,[wk]:{got_done:ai(p.got_done),not_done:ai(p.not_done),lessons:ai(p.lessons)}};
      setOrganized(n);cloudSave("retro_org",n);
    } catch(e){console.error(e);setRetroErr(true);}
    setLoading(false);
  };

  const del=(sec,id)=>{const org=organized[wk];if(!org)return;const n={...organized,[wk]:{...org,[sec]:org[sec].filter(i=>i.id!==id)}};setOrganized(n);cloudSave("retro_org",n);};
  const save=(sec,id)=>{const org=organized[wk];if(!org)return;const n={...organized,[wk]:{...org,[sec]:org[sec].map(i=>i.id===id?{...i,text:editVal}:i)}};setOrganized(n);cloudSave("retro_org",n);setEditingId(null);};
  const org=organized[wk];

  const renderSection=(title,sectionKey,borderColor)=>{
    if(!org||!(org[sectionKey]||[]).length) return null;
    return (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:800,letterSpacing:"0.1em",color:borderColor,marginBottom:8}}>{title}</div>
        {org[sectionKey].map(item=>(
          <RetroCard key={item.id} item={item} sectionKey={sectionKey} borderColor={borderColor} editingId={editingId} setEditingId={setEditingId} editVal={editVal} setEditVal={setEditVal} onSave={()=>save(sectionKey,item.id)} onDelete={()=>del(sectionKey,item.id)}/>
        ))}
      </div>
    );
  };

  return (
    <div>
      <SecHead title="Weekly Retro" sub="Dump your notes · AI organizes · Click to edit · × to delete"/>
      <WNav week={week} setWeek={w=>{setWeek(w);setEditingId(null);setEditVal("");}}/>
      <div ref={splitRef} style={{display:"flex",flexDirection:"row",gap:0,alignItems:"stretch",marginTop:16}}>
        <div style={{flex:org?`0 0 calc(${leftPct}% - 6px)`:"1 1 auto",minWidth:200}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:8}}>YOUR RAW NOTES</div>
          <textarea value={rawNotes[wk]||""} onChange={e=>{const n={...rawNotes,[wk]:e.target.value};setRawNotes(n);cloudSave("retro_raw",n);}}
            placeholder="Dump everything here…"
            style={{width:"100%",minHeight:280,fontSize:15,border:"1.5px solid #E5E7EB",borderRadius:10,padding:"14px",resize:"vertical",outline:"none",fontFamily:"inherit",boxSizing:"border-box",color:"#374151",lineHeight:1.7,background:"#fff"}}/>
          <button onClick={organize} disabled={loading} style={{marginTop:10,...bd,background:loading?"#9CA3AF":"#111827",cursor:loading?"not-allowed":"pointer",fontSize:14,padding:"9px 20px"}}>{loading?"⏳ Organizing…":"✦ Clearly Organize with AI"}</button>
          {retroErr&&!loading&&<div style={{fontSize:14,color:"#EF4444",marginTop:6}}>AI failed. Try again.</div>}
        </div>
        {org&&<div
          style={{width:12,cursor:"col-resize",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:4,flexShrink:0,userSelect:"none"}}
          onMouseDown={e=>{
            e.preventDefault();
            draggingRef.current=true;
            const container=splitRef.current;
            const onMove=mv=>{
              if(!draggingRef.current) return;
              const rect=container.getBoundingClientRect();
              const pct=Math.min(80,Math.max(20,((mv.clientX-rect.left)/rect.width)*100));
              setLeftPct(pct);
            };
            const onUp=()=>{draggingRef.current=false;window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
            window.addEventListener("mousemove",onMove);
            window.addEventListener("mouseup",onUp);
          }}>
          <div style={{width:3,height:40,borderRadius:3,background:"#D1D5DB"}}/>
        </div>}
        {org&&(
          <div style={{flex:"1 1 0",minWidth:200}}>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:"0.1em",color:"#6B7280",marginBottom:4}}>ORGANIZED — week of {wk}</div>
            <div style={{fontSize:12,color:"#9CA3AF",fontStyle:"italic",marginBottom:12}}>Click any item to edit · × to delete</div>
            {renderSection("✓ GOT DONE","got_done","#059669")}
            {renderSection("○ DIDN'T GET DONE","not_done","#DC2626")}
            {renderSection("→ LESSONS LEARNED","lessons","#D97706")}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auth (unchanged from App21) ───────────────────────────────────────────────
const TOKEN_KEY="mp_auth_token", EXPIRES_KEY="mp_auth_expires";
const isAuthed=()=>{try{const t=localStorage.getItem(TOKEN_KEY),e=localStorage.getItem(EXPIRES_KEY);return t==="mp_auth_v1_witronix"&&e&&Date.now()<Number(e);}catch{return false;}};
const saveAuth=(t,e)=>{try{localStorage.setItem(TOKEN_KEY,t);localStorage.setItem(EXPIRES_KEY,String(e));}catch{}};
const clearAuth=()=>{try{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(EXPIRES_KEY);}catch{}};

function LoginScreen({onLogin}) {
  const [pw,setPw]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if(!pw.trim()) return;
    setLoading(true);setError("");
    // Hash check — same logic as App21
    const h=pw.split("").reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0);
    if(h===1451501990){
      saveAuth("mp_auth_v1_witronix",Date.now()+7*24*60*60*1000);
      onLogin();
    } else {
      setError("Incorrect password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#F8F7F5",fontFamily:"'Georgia','Times New Roman',serif"}}>
      <div style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:16,padding:"48px 40px",width:360,boxShadow:"0 4px 24px rgba(0,0,0,0.06)"}}>
        <div style={{marginBottom:32,textAlign:"center"}}>
          <div style={{fontSize:14,letterSpacing:"0.2em",color:"#6B7280",textTransform:"uppercase",marginBottom:8}}>Wi-Tronix</div>
          <div style={{fontSize:24,fontWeight:800,color:"#111827",marginBottom:6}}>My Planner</div>
          <div style={{fontSize:14,color:"#9CA3AF"}}>Enter your access code to continue</div>
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="Access code" autoFocus
          style={{width:"100%",fontSize:16,padding:"12px 14px",border:`1.5px solid ${error?"#EF4444":"#E5E7EB"}`,borderRadius:8,outline:"none",fontFamily:"inherit",boxSizing:"border-box",letterSpacing:"0.2em",marginBottom:12}}/>
        {error&&<div style={{fontSize:12,color:"#EF4444",marginBottom:12}}>{error}</div>}
        <button onClick={submit} disabled={loading}
          style={{width:"100%",padding:"12px",background:loading?"#9CA3AF":"#111827",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {loading?"Checking…":"Enter →"}
        </button>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,setAuthed]=useState(isAuthed());
  const [screen,setScreen]=useState(0);
  // ITEM 15: Reactive isMobile
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  const [sidebarOpen,setSidebarOpen]=useState(false);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
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
      cloudLoad("cal_bars",{}),
    ]).then(([ff,pd,mt,bu,br,gb,et,si,rn,og,cb])=>{
      setFreeform(ff);setParsed(pd);setMergeTD(mt);setBottomUp(bu);setBuRaw(br);
      setGridBlocks(gb);setExtraTasks(et);setScheduledIds(si);setRawNotes(rn);setOrganized(og);
      // cal_bars lives in QuarterlyScreen local state — persist via lsSet so lsGet picks it up on next render
      lsSet("cal_bars",cb);
      setSyncing(false);
    }).catch(()=>setSyncing(false));
  },[]);

  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;

  const screens=[
    <AnnualScreen key="a" freeform={freeform} setFreeform={setFreeform} parsed={parsed} setParsed={setParsed}/>,
    <QuarterlyScreen key="q" parsed={parsed} setParsed={setParsed} mergeTD={mergeTD} setMergeTD={setMergeTD}/>,
    <WeeklyMergeScreen key="w" mergeTD={mergeTD} setMergeTD={setMergeTD} bottomUp={bottomUp} setBottomUp={setBottomUp} buRaw={buRaw} setBuRaw={setBuRaw} isMobile={isMobile}/>,
    <TimetableScreen key="t" mergeTD={mergeTD} gridBlocks={gridBlocks} setGridBlocks={setGridBlocks} extraTasks={extraTasks} setExtraTasks={setExtraTasks} scheduledIds={scheduledIds} setScheduledIds={setScheduledIds} isMobile={isMobile}/>,
    <RetroScreen key="r" rawNotes={rawNotes} setRawNotes={setRawNotes} organized={organized} setOrganized={setOrganized}/>,
  ];

  return (
    <div style={{fontFamily:"'Georgia','Times New Roman',serif",background:"#F8F7F5",minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row"}}>
      {isMobile&&(
        <div style={{background:"#111827",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div>
            <div style={{fontSize:12,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.2em"}}>Wi-Tronix</div>
            <div style={{fontSize:14,fontWeight:800,color:"#F9FAFB"}}>My Planner</div>
          </div>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",padding:"4px 8px"}}>☰</button>
        </div>
      )}
      {isMobile&&sidebarOpen&&(
        <div style={{background:"#111827",borderBottom:"1px solid #374151",zIndex:49}}>
          {NAV.map((n,i)=>(
            <button key={n} onClick={()=>{setScreen(i);setSidebarOpen(false);}}
              style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 20px",background:screen===i?"#1D4ED8":"none",border:"none",cursor:"pointer",color:screen===i?"#fff":"#9CA3AF",fontSize:14,fontFamily:"inherit",fontWeight:screen===i?700:400}}>
              <span style={{fontSize:16}}>{ICONS[i]}</span>{n}
            </button>
          ))}
        </div>
      )}
      {!isMobile&&(
        <div style={{width:200,background:"#111827",flexShrink:0,display:"flex",flexDirection:"column",padding:"24px 0",position:"sticky",top:0,height:"100vh"}}>
          <div style={{padding:"0 20px 24px",borderBottom:"1px solid #374151"}}>
            <div style={{fontSize:14,letterSpacing:"0.2em",color:"#6B7280",textTransform:"uppercase",marginBottom:4}}>Wi-Tronix</div>
            <div style={{fontSize:15,fontWeight:800,color:"#F9FAFB"}}>My Planner</div>
            <div style={{fontSize:14,color:syncing?"#F59E0B":"#10B981",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:syncing?"#F59E0B":"#10B981"}}/>
              {syncing?"Syncing…":"Synced ✓"}
            </div>
          </div>
          <nav style={{flex:1,padding:"16px 0"}}>
            {NAV.map((n,i)=>(
              <button key={n} onClick={()=>setScreen(i)}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 20px",background:screen===i?"#1D4ED8":"none",border:"none",cursor:"pointer",textAlign:"left",color:screen===i?"#fff":"#9CA3AF",fontSize:15,fontFamily:"inherit",fontWeight:screen===i?700:400,transition:"all 0.1s"}}>
                <span style={{fontSize:15,opacity:0.8}}>{ICONS[i]}</span>{n}
              </button>
            ))}
          </nav>
          <div style={{padding:"16px 20px",borderTop:"1px solid #374151"}}>
            <div style={{fontSize:14,letterSpacing:"0.15em",color:"#6B7280",textTransform:"uppercase",marginBottom:10}}>Streams</div>
            {PRIORITIES.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{fontSize:13,color:"#D1D5DB",lineHeight:1.3}}>{p.label}</span>
              </div>
            ))}
            <button onClick={()=>{clearAuth();setAuthed(false);}}
              style={{marginTop:12,width:"100%",padding:"6px 0",background:"none",border:"1px solid #374151",borderRadius:6,color:"#6B7280",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
          </div>
        </div>
      )}
      {/* ITEM 15: Fluid main content, no maxWidth cap */}
      <div style={{flex:1,padding:isMobile?"16px":"36px 32px",width:"100%",overflowY:"auto",overflowX:"hidden",boxSizing:"border-box"}}>
        {isMobile&&(
          <div style={{fontSize:14,color:"#9CA3AF",marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:syncing?"#F59E0B":"#10B981"}}/>
            {syncing?"Syncing…":"Synced ✓"} · {NAV[screen]}
          </div>
        )}
        {screens[screen]}
      </div>
    </div>
  );
}
