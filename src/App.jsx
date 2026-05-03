import { useState, useRef, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PRIORITIES = [
  { id: 1, label: "Customer Engagements",   short: "CE", color: "#2563EB", bg: "#EFF6FF", light: "#DBEAFE" },
  { id: 2, label: "Product Strategy",       short: "PS", color: "#7C3AED", bg: "#F5F3FF", light: "#EDE9FE" },
  { id: 3, label: "CDS",                    short: "CD", color: "#0891B2", bg: "#ECFEFF", light: "#CFFAFE" },
  { id: 4, label: "AI Native",              short: "AI", color: "#059669", bg: "#ECFDF5", light: "#D1FAE5" },
  { id: 5, label: "Product Discovery",      short: "PD", color: "#D97706", bg: "#FFFBEB", light: "#FEF3C7" },
  { id: 6, label: "Product Value Delivery", short: "PV", color: "#DC2626", bg: "#FEF2F2", light: "#FEE2E2" },
];
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["M","T","W","T","F","S","S"];
const DAYS       = ["Mon","Tue","Wed","Thu","Fri"];
const HOURS      = Array.from({length:13},(_,i)=>i+7);
const YEAR       = 2026;
const QUARTERS   = ["Q1","Q2","Q3","Q4"];
const Q_MONTHS   = { Q1:[0,1,2], Q2:[3,4,5], Q3:[6,7,8], Q4:[9,10,11] };
const WEEK_DATES = ["May 4","May 11","May 18","May 25","Jun 1"];
const NAV        = ["Annual","Quarterly","Weekly Merge","Timetable","Retro"];
const ICONS      = ["◈","⊞","⇄","⏱","✦"];

const getPriority = id => PRIORITIES.find(p => p.id === id);

const getWeekLabel = (year, month, day) => {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d); mon.setDate(d.getDate() + diff);
  return `${MONTHS[mon.getMonth()]} ${mon.getDate()}`;
};

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.REACT_APP_SUPAURL || "https://ggfqzxafrkicekfulceo.supabase.co";
const SUPA_KEY = process.env.REACT_APP_SUPAKEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnF6eGFmcmtpY2VrZnVsY2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzA5MDksImV4cCI6MjA5MzMwNjkwOX0.gSIxrR40RSooK53WrNmPZRBcoF2EKCqwvXbaEOKNlVM";
const TABLE    = "mihir_planner";
const SUPA_OK  = SUPA_URL.length > 0 && SUPA_KEY.length > 0;

const supaHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${SUPA_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

// Async save to Supabase + sync to localStorage as cache
const save = async (key, val) => {
  try { localStorage.setItem("mihir_" + key, JSON.stringify(val)); } catch {}
  if (!SUPA_OK) return;
  try {
    await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: supaHeaders,
      body: JSON.stringify({ key, value: val, updated_at: new Date().toISOString() }),
    });
  } catch(e) { console.warn("Supabase save failed, using local cache", e); }
};

// Sync load from localStorage cache (instant, for initial render)
const load = (key, fallback) => {
  try { const v = localStorage.getItem("mihir_" + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

// Async load from Supabase (call on mount to hydrate from cloud)
const loadFromCloud = async (key, fallback) => {
  if (!SUPA_OK) return load(key, fallback);
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${TABLE}?key=eq.${key}&select=value`,
      { headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}` } }
    );
    if (!res.ok) return load(key, fallback);
    const rows = await res.json();
    if (rows && rows.length > 0) {
      const val = rows[0].value;
      try { localStorage.setItem("mihir_" + key, JSON.stringify(val)); } catch {}
      return val;
    }
    return fallback;
  } catch(e) { return load(key, fallback); }
};

// Hook: loads from cloud on mount, falls back to localStorage cache instantly
const useCloudState = (key, fallback) => {
  const [state, setState] = useState(() => load(key, fallback));
  const setAndSave = (val) => { setState(val); save(key, val); };
  useEffect(() => {
    loadFromCloud(key, fallback).then(val => setState(val));
  }, []);
  return [state, setAndSave];
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const navBtn  = { background:"#F3F4F6", border:"1px solid #E5E7EB", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12, color:"#374151", fontFamily:"inherit" };
const selSt   = { fontSize:12, padding:"6px 8px", border:"1.5px solid #E5E7EB", borderRadius:6, outline:"none", fontFamily:"inherit", background:"#fff", color:"#374151", cursor:"pointer" };
const btnDark = { fontSize:12, padding:"7px 14px", background:"#111827", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontWeight:600 };
const btnGray = { fontSize:12, padding:"7px 14px", background:"#6B7280", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontWeight:600 };

// ─── SHARED ───────────────────────────────────────────────────────────────────
const Pill = ({ pid, small }) => {
  const p = getPriority(pid); if (!p) return null;
  return <span style={{ fontSize:small?9:10, fontWeight:700, color:p.color, background:p.light,
    border:`1px solid ${p.color}44`, borderRadius:20, padding:small?"1px 6px":"2px 8px", whiteSpace:"nowrap" }}>{p.short}</span>;
};

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:4 }}>Wi-Tronix · {YEAR}</div>
    <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:0, letterSpacing:"-0.02em" }}>{title}</h2>
    {sub && <div style={{ fontSize:13, color:"#6B7280", marginTop:4 }}>{sub}</div>}
  </div>
);

const WeekNav = ({ week, setWeek }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
    <button onClick={()=>setWeek(w=>Math.max(0,w-1))} style={navBtn}>◀</button>
    <span style={{ fontSize:14, fontWeight:700, color:"#111827", minWidth:60, textAlign:"center" }}>{WEEK_DATES[week]}</span>
    <button onClick={()=>setWeek(w=>Math.min(WEEK_DATES.length-1,w+1))} style={navBtn}>▶</button>
  </div>
);

const PlaceholderBtn = ({ label, icon }) => (
  <button style={{ fontSize:11, padding:"6px 12px", background:"#F3F4F6", color:"#9CA3AF",
    border:"1.5px dashed #D1D5DB", borderRadius:6, cursor:"not-allowed", fontFamily:"inherit",
    display:"flex", alignItems:"center", gap:5 }}>
    {icon} {label} <span style={{ fontSize:9 }}>(soon)</span>
  </button>
);

// ─── AI ───────────────────────────────────────────────────────────────────────
const callAI = async (prompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500,
      messages:[{ role:"user", content:prompt }] })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
};

// ─── SCREEN 1: ANNUAL ─────────────────────────────────────────────────────────
const AnnualScreen = ({ parsed, updateParsed, freeform, updateFreeform }) => {
  const [open,       setOpen]       = useState(null);
  const [loading,    setLoading]    = useState(null);
  const [editingPid, setEditingPid] = useState(null);
  const [draftText,  setDraftText]  = useState("");

  const saveFreeform = (pid, val) => updateFreeform({ ...freeform, [pid]: val });

  const parseWithAI = async (pid) => {
    const text = freeform[pid] || ""; if (!text.trim()) return;
    setLoading(pid);
    try {
      const p = getPriority(pid);
      // month: -1 means quarter-level only, no specific month
      const raw = await callAI(`Extract every task/outcome/commitment from planning notes for "${p.label}" in ${YEAR}.
Rules:
- If a SPECIFIC month is named (e.g. "May", "March"), set month to that month index (0=Jan, 11=Dec) and set quarter accordingly.
- If only a QUARTER is mentioned (e.g. "Q1", "Q2") with NO specific month, set month to -1 and set quarter to that value.
- quarter is always Q1/Q2/Q3/Q4.
Return ONLY raw JSON array, no markdown:
[{"text":"task","month":4,"quarter":"Q2","pid":${pid}}]
Notes: ${text}`);
      const items = JSON.parse(raw.replace(/```json|```/g,"").trim());
      updateParsed({ ...parsed, [pid]: items.map(i=>({...i,id:Date.now()+Math.random(),weekAssigned:null,startDay:0,endDay:4})) });
    } catch(e) { console.error(e); }
    setLoading(null);
  };

  return (
    <div>
      <SectionHeader title="Annual Command Center" sub="Write freely · AI maps your plans to the quarterly calendar" />
      <div style={{ fontSize:12, color:"#1D4ED8", background:"#EFF6FF", border:"1px solid #BFDBFE",
        borderRadius:8, padding:"10px 14px", marginBottom:20, lineHeight:1.6 }}>
        💡 Write naturally — mention Q1, specific months, or just describe goals. Hit <strong>"Parse with AI"</strong> to map to the Quarterly Calendar. Quarter-only items (e.g. "Q2 Metro renewal") appear at the top of that quarter, not pinned to a month.
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {PRIORITIES.map(p => {
          const isOpen = open===p.id, isEditing = editingPid===p.id, items = parsed[p.id]||[];
          return (
            <div key={p.id} style={{ background:"#fff", border:`1.5px solid ${p.color}33`, borderLeft:`4px solid ${p.color}`, borderRadius:10, overflow:"hidden" }}>
              <div onClick={()=>setOpen(isOpen?null:p.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 18px", cursor:"pointer", background:isOpen?p.bg:"#fff" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:26,height:26,borderRadius:"50%",background:p.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:800 }}>{p.short}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:"#1a1a1a" }}>{p.label}</span>
                  {items.length>0 && <span style={{ fontSize:9, color:p.color, background:p.light, border:`1px solid ${p.color}33`, borderRadius:10, padding:"1px 8px" }}>{items.length} parsed</span>}
                </div>
                <span style={{ color:"#ccc" }}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen && (
                <div style={{ borderTop:`1px solid ${p.color}22` }}>
                  <div style={{ padding:"16px 18px", background:p.bg }}>
                    <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:p.color, marginBottom:8 }}>YOUR PLANS</div>
                    {isEditing ? (
                      <div>
                        <textarea autoFocus value={draftText} onChange={e=>setDraftText(e.target.value)}
                          style={{ width:"100%", minHeight:130, fontSize:13, border:`1.5px solid ${p.color}66`, borderRadius:8, padding:"10px 12px", resize:"vertical", outline:"none", fontFamily:"inherit", boxSizing:"border-box", color:"#333", lineHeight:1.7, background:"#fff" }}
                          placeholder="Write freely — Q2 Metro renewal, May conference, Q3 ship occupancy v2…" />
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={()=>{ saveFreeform(p.id,draftText); setEditingPid(null); }} style={{...btnDark,background:p.color}}>Save</button>
                          <button onClick={()=>setEditingPid(null)} style={btnGray}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={()=>{ setEditingPid(p.id); setDraftText(freeform[p.id]||""); }} style={{ cursor:"text", padding:"10px 12px", background:"#fff", borderRadius:8, border:`1px solid ${p.color}33`, minHeight:60 }}>
                        {freeform[p.id] ? <div style={{ fontSize:13, color:"#374151", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{freeform[p.id]}</div>
                          : <div style={{ fontSize:12, color:"#ccc", fontStyle:"italic" }}>Click to write your plans…</div>}
                      </div>
                    )}
                    {freeform[p.id] && !isEditing && (
                      <button onClick={()=>parseWithAI(p.id)} disabled={loading===p.id}
                        style={{ marginTop:10, ...btnDark, background:loading===p.id?"#9CA3AF":"#111827", cursor:loading===p.id?"not-allowed":"pointer" }}>
                        {loading===p.id?"⏳ Parsing…":"✦ Parse with AI → Quarterly Calendar"}
                      </button>
                    )}
                  </div>
                  {items.length>0 && (
                    <div style={{ padding:"12px 18px", borderTop:`1px solid ${p.color}22` }}>
                      <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#6B7280", marginBottom:8 }}>PARSED ITEMS</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {items.map(item=>(
                          <div key={item.id} style={{ fontSize:11, color:p.color, background:p.light, border:`1px solid ${p.color}33`, borderRadius:6, padding:"3px 9px" }}>
                            <span style={{ color:"#9CA3AF", marginRight:4, fontSize:10 }}>{item.month===-1?item.quarter:MONTHS[item.month]}</span>{item.text}
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
};

// ─── WEEK BAR (overlaid, resizable) ───────────────────────────────────────────
const DAY_W = 38;

const WeekBar = ({ task, onUpdate, onBarDragStart, onBarDragEnd }) => {
  const p = getPriority(task.pid);
  const startDay = task.startDay ?? 0;
  const endDay   = task.endDay   ?? 4;

  const left  = startDay * DAY_W;
  const width = (endDay - startDay + 1) * DAY_W - 4;

  const handleResizeDrag = (side, e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, origStart = startDay, origEnd = endDay;
    const onMove = mv => {
      const delta = Math.round((mv.clientX - startX) / DAY_W);
      if (side==="left") onUpdate({ startDay:Math.max(0,Math.min(origStart+delta,origEnd)), endDay:origEnd });
      else               onUpdate({ startDay:origStart, endDay:Math.min(4,Math.max(origEnd+delta,origStart)) });
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
  };

  const handleBarDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData("movedTaskId", String(task.id));
    e.dataTransfer.setData("action", "moveBar");
    if (onBarDragStart) onBarDragStart(task.id);
  };

  const handleBarDragEnd = (e) => {
    if (onBarDragEnd) onBarDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleBarDragStart}
      onDragEnd={handleBarDragEnd}
      style={{ position:"absolute", left, top:3, width, height:20,
        background:p?.color, borderRadius:5, display:"flex", alignItems:"center",
        justifyContent:"space-between", overflow:"hidden", zIndex:10,
        boxShadow:"0 1px 4px rgba(0,0,0,0.2)", userSelect:"none", cursor:"grab" }}>
      <div onMouseDown={e=>handleResizeDrag("left",e)}
        style={{ width:10, height:"100%", cursor:"ew-resize", background:"rgba(255,255,255,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontSize:7, color:"#fff" }}>◂</span>
      </div>
      <span style={{ fontSize:9, color:"#fff", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis",
        whiteSpace:"nowrap", flex:1, textAlign:"center", padding:"0 2px" }}>
        {task.text.length>20?task.text.slice(0,18)+"…":task.text}
      </span>
      <div onMouseDown={e=>handleResizeDrag("right",e)}
        style={{ width:10, height:"100%", cursor:"ew-resize", background:"rgba(255,255,255,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontSize:7, color:"#fff" }}>▸</span>
      </div>
    </div>
  );
};

// ─── SCREEN 2: QUARTERLY ──────────────────────────────────────────────────────
const QuarterlyScreen = ({ mergeTD, updateMergeTD, parsed, updateParsed }) => {
  const [quarter,    setQuarter]    = useState(1);
  const [dragItem,   setDragItem]   = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dragBarId,  setDragBarId]  = useState(null);

  const qMonths    = Q_MONTHS[QUARTERS[quarter]];
  const qLabel     = QUARTERS[quarter];
  const allTasks   = PRIORITIES.flatMap(p=>(parsed[p.id]||[]).map(t=>({...t,pid:p.id})));

  // Quarter-level items: month === -1 and quarter matches, not yet week-assigned
  const qLevelItems = allTasks.filter(t => t.month===-1 && t.quarter===qLabel && !t.weekAssigned);
  // Month-level unassigned
  const unassignedForMonth = m => allTasks.filter(t=>t.month===m && !t.weekAssigned);
  // Assigned tasks (have weekAssigned) — includes q-level tasks that got assigned to this month
  const assignedForMonth   = m => allTasks.filter(t=>t.month===m && !!t.weekAssigned);
  // All assigned across this quarter (for bar drag unschedule)
  const allAssigned = qMonths.flatMap(m=>assignedForMonth(m));

  const schedulTask = (item, weekLabel, targetMonth) => {
    const next = { ...parsed };
    const monthUpdate = (item.month === -1 && targetMonth !== undefined) ? { month: targetMonth } : {};
    PRIORITIES.forEach(p=>{ if(next[p.id]) next[p.id]=next[p.id].map(t=>t.id===item.id?{...t,weekAssigned:weekLabel,startDay:0,endDay:4,...monthUpdate}:t); });
    updateParsed(next);
    const wNext = { ...mergeTD };
    if(!(wNext[weekLabel]||[]).find(e=>e.id===item.id)){
      wNext[weekLabel]=[...(wNext[weekLabel]||[]),{text:item.text,pid:item.pid,id:item.id,fromAnnual:true}];
    }
    updateMergeTD(wNext);
  };

  const unscheduleTask = (item) => {
    const next = { ...parsed };
    PRIORITIES.forEach(p=>{ if(next[p.id]) next[p.id]=next[p.id].map(t=>t.id===item.id?{...t,weekAssigned:null,startDay:0,endDay:4}:t); });
    updateParsed(next);
    const wNext = { ...mergeTD };
    Object.keys(wNext).forEach(wk=>{ wNext[wk]=(wNext[wk]||[]).filter(t=>t.id!==item.id); });
    updateMergeTD(wNext);
  };

  const moveBarToWeek = (taskId, newWeekLabel) => {
    const task = allTasks.find(t=>t.id===taskId); if (!task) return;
    const wNext = { ...mergeTD };
    if (task.weekAssigned) wNext[task.weekAssigned]=(wNext[task.weekAssigned]||[]).filter(t=>t.id!==taskId);
    if(!(wNext[newWeekLabel]||[]).find(e=>e.id===taskId)){
      wNext[newWeekLabel]=[...(wNext[newWeekLabel]||[]),{text:task.text,pid:task.pid,id:taskId,fromAnnual:true}];
    }
    updateMergeTD(wNext);
    const next = { ...parsed };
    PRIORITIES.forEach(p=>{ if(next[p.id]) next[p.id]=next[p.id].map(t=>t.id===taskId?{...t,weekAssigned:newWeekLabel,startDay:0,endDay:4}:t); });
    updateParsed(next);
  };

  const updateBarRange = (taskId, updates) => {
    const next = { ...parsed };
    PRIORITIES.forEach(p=>{ if(next[p.id]) next[p.id]=next[p.id].map(t=>t.id===taskId?{...t,...updates}:t); });
    updateParsed(next);
  };

  const getWeekRows = (month) => {
    const firstDay=new Date(YEAR,month,1).getDay(), dim=new Date(YEAR,month+1,0).getDate();
    const offset=firstDay===0?6:firstDay-1;
    const cells=Array.from({length:Math.ceil((offset+dim)/7)*7},(_,i)=>{ const d=i-offset+1; return(d>=1&&d<=dim)?d:null; });
    const rows=[]; for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7)); return rows;
  };

  const ROW_H = 34; // fixed row height — bars overlay on top, no extra lines

  return (
    <div>
      <SectionHeader title="Quarterly Calendar" sub="Drag tasks onto a week · Resize bar ends · Drag bar to move · Drag back to unschedule" />
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setQuarter(q=>Math.max(0,q-1))} style={navBtn}>◀</button>
        <span style={{ fontSize:16, fontWeight:800, color:"#111827" }}>{qLabel} {YEAR}</span>
        <button onClick={()=>setQuarter(q=>Math.min(3,q+1))} style={navBtn}>▶</button>
      </div>

      {/* Quarter-level holding area */}
      {qLevelItems.length>0 && (
        <div
          onDragOver={e=>{e.preventDefault();setDropTarget("qzone");}}
          onDragLeave={()=>setDropTarget(null)}
          onDrop={e=>{
            e.preventDefault();
            const action=e.dataTransfer.getData("action");
            const movedId=e.dataTransfer.getData("movedTaskId");
            if(action==="moveBar"&&movedId){
              unscheduleTask(allTasks.find(t=>t.id===Number(movedId))||{id:Number(movedId)});
            }
            setDropTarget(null); setDragBarId(null);
          }}
          style={{ background:dropTarget==="qzone"?"#EFF6FF":"#F8FAFF",
            border:dropTarget==="qzone"?"2px dashed #2563EB":"1.5px dashed #BFDBFE",
            borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#2563EB", marginBottom:8 }}>
            {qLabel} — QUARTER-LEVEL (no specific month yet)
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {qLevelItems.map(task=>{
              const p=getPriority(task.pid);
              return (
                <div key={task.id} draggable
                  onDragStart={e=>{ setDragItem(task); e.dataTransfer.setData("action","newTask"); }}
                  onDragEnd={()=>{setDragItem(null);setDropTarget(null);}}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:7,
                    background:p?.light, border:`1.5px solid ${p?.color}44`, cursor:"grab", userSelect:"none",
                    opacity:dragItem?.id===task.id?0.35:1 }}>
                  <span style={{ fontSize:11, color:p?.color, opacity:0.5 }}>⠿</span>
                  <span style={{ fontSize:12, color:p?.color }}>{task.text}</span>
                  <Pill pid={task.pid} small />
                </div>
              );
            })}
          </div>
          {dropTarget==="qzone" && <div style={{ fontSize:10, color:"#2563EB", marginTop:6, fontStyle:"italic" }}>Drop here to unschedule</div>}
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {qMonths.map(month=>{
          const rows=getWeekRows(month);
          const ua=unassignedForMonth(month);
          const asgn=assignedForMonth(month);
          return (
            <div key={month} style={{ background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:12, overflow:"hidden" }}>
              <div style={{ background:"#111827", padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#F9FAFB" }}>{MONTH_FULL[month]}</div>
                <div style={{ fontSize:10, color:"#6B7280" }}>{allTasks.filter(t=>t.month===month).length} tasks · {asgn.length} scheduled</div>
              </div>
              <div style={{ display:"flex" }}>
                {/* Calendar column */}
                <div style={{ flex:"0 0 300px", padding:"10px 12px", borderRight:"1px solid #F3F4F6" }}>
                  {/* Day headers */}
                  <div style={{ display:"grid", gridTemplateColumns:`repeat(7,${DAY_W}px)`, gap:1, marginBottom:4 }}>
                    {DAYS_SHORT.map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:9, color:"#9CA3AF", fontWeight:700, width:DAY_W }}>{d}</div>)}
                  </div>
                  {/* Week rows */}
                  {rows.map((week,wi)=>{
                    const firstValid=week.find(d=>d!==null);
                    const weekLabel=firstValid?getWeekLabel(YEAR,month,firstValid):null;
                    const isDropOver=(dropTarget?.month===month&&dropTarget?.weekLabel===weekLabel)&&(dragItem||dragBarId);
                    const weekAssignedTasks=weekLabel?asgn.filter(t=>t.weekAssigned===weekLabel):[];
                    return (
                      <div key={wi} style={{ position:"relative", marginBottom:2 }}
                        onDragOver={e=>{e.preventDefault();if(weekLabel)setDropTarget({month,weekLabel});}}
                        onDragLeave={()=>setDropTarget(null)}
                        onDrop={e=>{
                          e.preventDefault();
                          const action=e.dataTransfer.getData("action");
                          const movedId=e.dataTransfer.getData("movedTaskId");
                          if(weekLabel){
                            if(action==="moveBar"&&movedId) moveBarToWeek(Number(movedId),weekLabel);
                            else if(dragItem) schedulTask(dragItem,weekLabel,month);
                          }
                          setDropTarget(null); setDragItem(null); setDragBarId(null);
                        }}>
                        {/* The fixed-height row with day cells — bars overlay on top */}
                        <div style={{ display:"grid", gridTemplateColumns:`repeat(7,${DAY_W}px)`, gap:1,
                          height:ROW_H,
                          background:isDropOver?"#EFF6FF":"transparent",
                          border:isDropOver?"2px dashed #2563EB":"2px solid transparent",
                          borderRadius:6, padding:"2px", boxSizing:"border-box" }}>
                          {week.map((d,di)=>(
                            <div key={di} style={{ height:"100%", padding:"2px 3px",
                              background:d?"#FAFAFA":"transparent",
                              border:d?"1px solid #F3F4F6":"none", borderRadius:3,
                              display:"flex", flexDirection:"column" }}>
                              {d && <div style={{ fontSize:9, color:"#9CA3AF", fontWeight:600 }}>{d}</div>}
                            </div>
                          ))}
                        </div>
                        {/* Bars overlay — absolutely positioned on top of the row */}
                        {weekAssignedTasks.map((task,ti)=>(
                          <div key={task.id} style={{ position:"absolute", top:0, left:0, width:"100%", height:ROW_H, pointerEvents:"none" }}>
                            <div style={{ position:"relative", height:ROW_H, pointerEvents:"all" }}>
                              <WeekBar
                                task={task}
                                onUpdate={updates=>updateBarRange(task.id,updates)}
                                onBarDragStart={id=>setDragBarId(id)}
                                onBarDragEnd={()=>setDragBarId(null)}
                              />
                            </div>
                          </div>
                        ))}
                        {isDropOver&&weekLabel&&<div style={{ position:"absolute", bottom:-16, left:0, fontSize:9, color:"#2563EB", fontWeight:700, whiteSpace:"nowrap" }}>→ week of {weekLabel}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Task lists */}
                <div style={{ flex:1, padding:"12px 14px" }}>
                  {/* Unassigned for this month */}
                  {ua.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color:"#9CA3AF", marginBottom:6 }}>DRAG TO SCHEDULE</div>
                      {ua.map(task=>{
                        const p=getPriority(task.pid);
                        return (
                          <div key={task.id} draggable
                            onDragStart={e=>{setDragItem(task);e.dataTransfer.setData("action","newTask");}}
                            onDragEnd={()=>{setDragItem(null);setDropTarget(null);}}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 9px", marginBottom:4,
                              borderRadius:7, background:p?.light, border:`1.5px solid ${p?.color}44`,
                              cursor:"grab", userSelect:"none", opacity:dragItem?.id===task.id?0.35:1 }}>
                            <span style={{ fontSize:12, color:p?.color, opacity:0.5 }}>⠿</span>
                            <span style={{ fontSize:12, color:p?.color, flex:1, lineHeight:1.3 }}>{task.text}</span>
                            <Pill pid={task.pid} small />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Scheduled list */}
                  {asgn.length>0 && (
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color:"#9CA3AF", marginBottom:6 }}>SCHEDULED</div>
                      {asgn.map(task=>{
                        const p=getPriority(task.pid);
                        const sd=task.startDay??0,ed=task.endDay??4;
                        const dayLabel=ed-sd===4?"Full week":DAYS.slice(sd,ed+1).join("–");
                        return (
                          <div key={task.id}
                            draggable
                            onDragStart={e=>{setDragBarId(task.id);e.dataTransfer.setData("action","moveBar");e.dataTransfer.setData("movedTaskId",task.id);}}
                            onDragEnd={()=>{setDragBarId(null);setDropTarget(null);}}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 9px", marginBottom:4,
                              borderRadius:7, background:"#F9FAFB", border:"1px solid #E5E7EB", cursor:"grab" }}>
                            <span style={{ fontSize:10, color:"#10B981" }}>✓</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11, color:"#6B7280", textDecoration:"line-through" }}>{task.text}</div>
                              <div style={{ fontSize:9, color:"#9CA3AF" }}>wk {task.weekAssigned} · {dayLabel}</div>
                            </div>
                            <Pill pid={task.pid} small />
                            <button onClick={()=>unscheduleTask(task)} style={{ background:"none", border:"none", cursor:"pointer", color:"#D1D5DB", fontSize:14, padding:0 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {allTasks.filter(t=>t.month===month).length===0 && (
                    <div style={{ fontSize:11, color:"#D1D5DB", fontStyle:"italic" }}>No tasks for {MONTHS[month]}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drop zone for unscheduling by dropping back on bottom */}
      <div
        onDragOver={e=>{e.preventDefault();setDropTarget("unschedule-bottom");}}
        onDragLeave={()=>setDropTarget(null)}
        onDrop={e=>{
          e.preventDefault();
          const action=e.dataTransfer.getData("action");
          const movedId=e.dataTransfer.getData("movedTaskId");
          if(action==="moveBar"&&movedId){
            const task=allTasks.find(t=>t.id===Number(movedId));
            if(task) unscheduleTask(task);
          }
          setDropTarget(null); setDragBarId(null);
        }}
        style={{ marginTop:16, padding:"12px", borderRadius:10, textAlign:"center",
          background:dropTarget==="unschedule-bottom"?"#FEF2F2":"#FAFAF8",
          border:dropTarget==="unschedule-bottom"?"2px dashed #DC2626":"1.5px dashed #E5E7EB",
          fontSize:11, color:"#9CA3AF", fontStyle:"italic", transition:"all 0.1s" }}>
        ↓ Drop a scheduled bar here to unschedule it
      </div>
    </div>
  );
};

// ─── SCREEN 3: WEEKLY MERGE ───────────────────────────────────────────────────
const WeeklyMergeScreen = ({ mergeTD, updateMergeTD, bottomUp, updateBottomUp, buFreeform, updateBuFreeform }) => {
  const [week,       setWeek]       = useState(0);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [newText,    setNewText]    = useState("");
  const [newPid,     setNewPid]     = useState(1);
  const [planEditId,  setPlanEditId]  = useState(null);
  const [planEditVal, setPlanEditVal] = useState("");
  const wk = WEEK_DATES[week];

  const buItems   = bottomUp[wk] || [];
  const currentTD = mergeTD[wk] || [];

  const savePlanEdit = (item) => {
    if (!planEditVal.trim()) { setPlanEditId(null); return; }
    // Update in mergeTD (top-down items)
    const inTD = currentTD.find(t => t.id === item.id);
    if (inTD) {
      const next = { ...mergeTD, [wk]: currentTD.map(t => t.id===item.id ? {...t, text:planEditVal} : t) };
      updateMergeTD(next);
    } else {
      // It's a bottom-up item
      const next = { ...bottomUp, [wk]: buItems.map(t => t.id===item.id ? {...t, text:planEditVal} : t) };
      updateBottomUp(next);
    }
    setPlanEditId(null);
  };

  const deletePlanItem = (item) => {
    const inTD = currentTD.find(t => t.id === item.id);
    if (inTD) {
      const next = { ...mergeTD, [wk]: currentTD.filter(t => t.id !== item.id) };
      updateMergeTD(next);
    } else {
      const next = { ...bottomUp, [wk]: buItems.filter(t => t.id !== item.id) };
      updateBottomUp(next);
    }
  };

  const addManualTD = () => {
    if (!newText.trim()) return;
    const next = { ...mergeTD, [wk]: [...currentTD, { text:newText, pid:newPid, id:Date.now(), fromAnnual:false }] };
    updateMergeTD(next);
    setNewText("");
  };

  const parseBU = async () => {
    const raw = buFreeform[wk] || ""; if (!raw.trim()) return;
    setAiLoading(true);
    try {
      const resp = await callAI(`Convert rough notes into clean action items (under 12 words each). Assign pid from: ${PRIORITIES.map(p=>`${p.id}=${p.label}`).join(", ")}. Use pid=1 if unclear.
Return ONLY raw JSON array:
[{"text":"action item","pid":1}]
Notes: ${raw}`);
      const items = JSON.parse(resp.replace(/```json|```/g,"").trim());
      const next  = { ...bottomUp, [wk]: items.map(i=>({...i,id:Date.now()+Math.random(),done:false})) };
      updateBottomUp(next);
    } catch(e) { console.error(e); }
    setAiLoading(false);
  };

  const toggleBU = id => {
    const next = { ...bottomUp, [wk]: buItems.map(i=>i.id===id?{...i,done:!i.done}:i) };
    updateBottomUp(next);
  };

  const allThisWeek = [...currentTD, ...buItems.filter(i=>!i.done)];

  return (
    <div>
      <SectionHeader title="Weekly Merge" sub="Top-down + bottom-up → this week's plan" />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <WeekNav week={week} setWeek={setWeek} />
        <PlaceholderBtn label="Connect Outlook / Teams" icon="🔗" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* LEFT — from annual/quarterly */}
        <div style={{ background:"#fff", border:"1.5px solid #E0E7FF", borderRadius:10, padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:"#2563EB", marginBottom:10 }}>↓ FROM ANNUAL PLAN</div>
          {currentTD.length===0 && <div style={{ fontSize:11, color:"#ccc", fontStyle:"italic", marginBottom:10 }}>Drag tasks from Quarterly Calendar to populate, or add below.</div>}
          {currentTD.map(item=>{
            const p=getPriority(item.pid);
            return (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #F3F4F6" }}>
                <div style={{ width:6,height:6,borderRadius:"50%", background:p?.color, flexShrink:0 }} />
                <span style={{ fontSize:13, flex:1, color:"#374151" }}>{item.text}</span>
                {item.fromAnnual && <span style={{ fontSize:9, color:"#9CA3AF" }}>annual</span>}
                <Pill pid={item.pid} small />
              </div>
            );
          })}
          <div style={{ display:"flex", gap:6, marginTop:12 }}>
            <input value={newText} onChange={e=>setNewText(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addManualTD()}
              placeholder="Add more…"
              style={{ flex:1, fontSize:12, padding:"6px 9px", border:"1.5px solid #E5E7EB", borderRadius:6, outline:"none", fontFamily:"inherit" }} />
            <select value={newPid} onChange={e=>setNewPid(Number(e.target.value))} style={{...selSt,fontSize:11}}>
              {PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.short}</option>)}
            </select>
            <button onClick={addManualTD} style={btnDark}>+</button>
          </div>
        </div>
        {/* RIGHT — email/verbal */}
        <div style={{ background:"#fff", border:"1.5px solid #FEF3C7", borderRadius:10, padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:"#D97706", marginBottom:10 }}>↑ FROM EMAIL / VERBAL</div>
          <textarea value={buFreeform[wk]||""}
            onChange={e=>{ const next={...buFreeform,[wk]:e.target.value}; updateBuFreeform(next); }}
            placeholder={"Paste emails, type or speak your tasks…\n\nE.g.:\n- Follow up with LA Metro on contract\n- Review PATS prototype feedback\n- Prep for Thursday standup"}
            style={{ width:"100%", minHeight:120, fontSize:12, border:"1.5px solid #FDE68A", borderRadius:8,
              padding:"10px 12px", resize:"vertical", outline:"none", fontFamily:"inherit",
              boxSizing:"border-box", color:"#374151", lineHeight:1.6 }} />
          <button onClick={parseBU} disabled={aiLoading}
            style={{ marginTop:8, ...btnDark, background:aiLoading?"#9CA3AF":"#D97706", cursor:aiLoading?"not-allowed":"pointer" }}>
            {aiLoading?"⏳ Parsing…":"✦ AI → Clean Task List"}
          </button>
          {buItems.length>0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#9CA3AF", marginBottom:6 }}>PARSED TASKS</div>
              {buItems.map(item=>{
                const p=getPriority(item.pid);
                return (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", marginBottom:3,
                    borderRadius:6, background:item.done?"#F9FAFB":p?.light||"#F9FAFB",
                    border:`1px solid ${item.done?"#E5E7EB":p?.color+"33"||"#E5E7EB"}` }}>
                    <input type="checkbox" checked={!!item.done} onChange={()=>toggleBU(item.id)} style={{ cursor:"pointer", accentColor:p?.color, flexShrink:0 }} />
                    <span style={{ fontSize:12, flex:1, color:item.done?"#9CA3AF":"#374151", textDecoration:item.done?"line-through":"none" }}>{item.text}</span>
                    {p && <Pill pid={item.pid} small />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {allThisWeek.length>0 && (
        <div style={{ marginTop:14, background:"#F8FAFF", border:"1.5px solid #DBEAFE", borderRadius:10, padding:"16px 18px" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", color:"#1D4ED8", marginBottom:10 }}>THIS WEEK'S PLAN — {wk}</div>
          {allThisWeek.map(item=>{
            const p = getPriority(item.pid);
            const isEd = planEditId === item.id;
            return (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #E0E7FF" }}>
                <div style={{ width:6,height:6,borderRadius:"50%", background:p?.color, flexShrink:0 }} />
                {isEd ? (
                  <div style={{ display:"flex", gap:6, flex:1, alignItems:"center" }}>
                    <input autoFocus value={planEditVal} onChange={e=>setPlanEditVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") savePlanEdit(item); if(e.key==="Escape") setPlanEditId(null); }}
                      style={{ flex:1, fontSize:12, padding:"4px 8px", border:`1.5px solid ${p?.color||"#2563EB"}`,
                        borderRadius:5, outline:"none", fontFamily:"inherit" }} />
                    <button onClick={()=>savePlanEdit(item)} style={{...btnDark,fontSize:10,padding:"3px 8px"}}>✓</button>
                    <button onClick={()=>setPlanEditId(null)} style={{...btnGray,fontSize:10,padding:"3px 8px"}}>✕</button>
                  </div>
                ) : (
                  <span onClick={()=>{ setPlanEditId(item.id); setPlanEditVal(item.text); }}
                    style={{ fontSize:13, flex:1, color:"#1e3a8a", cursor:"text" }}>{item.text}</span>
                )}
                {!isEd && <Pill pid={item.pid} small />}
                {!isEd && (
                  <button onClick={()=>deletePlanItem(item)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#CBD5E1",
                      fontSize:15, padding:0, lineHeight:1, flexShrink:0 }}
                    onMouseEnter={e=>e.currentTarget.style.color="#EF4444"}
                    onMouseLeave={e=>e.currentTarget.style.color="#CBD5E1"}>×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── SCREEN 4: TIMETABLE ──────────────────────────────────────────────────────
const CELL_H = 26;
const COL_W  = 120;

const TimetableScreen = ({ mergeTD, gridBlocks, updateGridBlocks, extraTasks, updateExtraTasks, scheduledIds, updateScheduled }) => {
  const [week,         setWeek]         = useState(0);
  const [dragTask,     setDragTask]     = useState(null);
  const [newExtra,     setNewExtra]     = useState("");
  const [inlineEdit,   setInlineEdit]   = useState(null);
  const [inlineVal,    setInlineVal]    = useState("");
  const wk = WEEK_DATES[week];

  const tdItems  = mergeTD[wk] || [];
  const buItems  = (load("merge_bu",{})[wk]||[]).filter(i=>!i.done);
  const panelTasks = [...tdItems, ...buItems, ...extraTasks];

  const ck = (day, slotIndex) => `${wk}-${day}-${slotIndex}`;

  const dropOnSlot = (day, slotIndex) => {
    if (!dragTask) return;
    const key = ck(day, slotIndex);
    const next = { ...gridBlocks, [key]: { text:dragTask.text, pid:dragTask.pid, id:dragTask.id, slots:2 } };
    updateGridBlocks(next);
    const sNext = [...new Set([...scheduledIds, dragTask.id])];
    updateScheduled(sNext);
    setDragTask(null);
  };

  const removeBlock = (key) => {
    const b = gridBlocks[key];
    if (b) { const sNext=scheduledIds.filter(id=>id!==b.id); updateScheduled(sNext); }
    const next = { ...gridBlocks }; delete next[key];
    updateGridBlocks(next);
  };

  const saveInline = (day, slotIndex) => {
    if (!inlineVal.trim()) { setInlineEdit(null); return; }
    const key = ck(day, slotIndex);
    const next = { ...gridBlocks, [key]: { text:inlineVal, pid:1, id:Date.now(), slots:2 } };
    updateGridBlocks(next);
    setInlineEdit(null); setInlineVal("");
  };

  const addExtra = () => {
    if (!newExtra.trim()) return;
    const item = { text:newExtra, pid:1, id:Date.now() };
    const next = [...extraTasks, item]; updateExtraTasks(next);
    setNewExtra("");
  };

  // Track which slots are covered by multi-slot blocks
  const occupiedSlots = {};
  DAYS.forEach(day => {
    for (let si = 0; si < HOURS.length * 2; si++) {
      const b = gridBlocks[ck(day, si)];
      if (b) { for (let s = 1; s < b.slots; s++) occupiedSlots[`${day}-${si+s}`] = si; }
    }
  });

  const printTimetable = () => {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Week of ${wk}</title><style>
      body{font-family:Georgia,serif;margin:20px;}h2{font-size:15px;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;}
      th,td{border:1px solid #ddd;padding:5px;font-size:10px;vertical-align:top;height:18px;}
      th{background:#f5f5f5;font-weight:700;text-align:center;}
      .hr{color:#aaa;font-size:9px;text-align:right;width:36px;background:#fafafa;}
      @media print{@page{size:landscape;margin:10mm;}}
    </style></head><body>`);
    w.document.write(`<h2>Week of ${wk} · ${YEAR}</h2><table><thead><tr><th class="hr"></th>`);
    DAYS.forEach(d=>w.document.write(`<th>${d}</th>`));
    w.document.write('</tr></thead><tbody>');
    HOURS.forEach(h=>{
      [0,1].forEach(half=>{
        const si=(h-7)*2+half;
        w.document.write(`<tr><td class="hr">${half?":30":h<12?h+"am":h===12?"12pm":(h-12)+"pm"}</td>`);
        DAYS.forEach(d=>{ const b=gridBlocks[ck(d,si)]; w.document.write(`<td>${b?b.text:''}</td>`); });
        w.document.write('</tr>');
      });
    });
    w.document.write('</tbody></table></body></html>');
    w.document.close(); w.print();
  };

  return (
    <div>
      <SectionHeader title="Hour-by-Hour Timetable" sub="Drag tasks · Resize blocks vertically · Click empty cell to add" />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <WeekNav week={week} setWeek={setWeek} />
        <div style={{ display:"flex", gap:8 }}>
          <PlaceholderBtn label="Sync Outlook Calendar" icon="📅" />
          <button onClick={printTimetable} style={btnDark}>⎙ Export for iPad</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
        {/* Task panel */}
        <div style={{ width:165, flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#6B7280", marginBottom:6 }}>THIS WEEK'S TASKS</div>
          <div style={{ fontSize:10, color:"#9CA3AF", marginBottom:8, fontStyle:"italic" }}>Drag onto grid →</div>
          {panelTasks.length===0 && <div style={{ fontSize:11, color:"#D1D5DB", fontStyle:"italic", marginBottom:8 }}>Add tasks in Weekly Merge first.</div>}
          {panelTasks.map(task=>{
            const p=getPriority(task.pid);
            const isScheduled=scheduledIds.includes(task.id);
            return (
              <div key={task.id} draggable={!isScheduled}
                onDragStart={()=>!isScheduled&&setDragTask(task)}
                onDragEnd={()=>setDragTask(null)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 7px", marginBottom:3,
                  borderRadius:6, background:isScheduled?"#F9FAFB":p?.light||"#F0FDF4",
                  border:`1.5px solid ${isScheduled?"#E5E7EB":p?.color+"44"||"#D1FAE5"}`,
                  cursor:isScheduled?"default":"grab", userSelect:"none",
                  opacity:dragTask?.id===task.id?0.35:1 }}>
                <span style={{ fontSize:10, opacity:0.4, color:p?.color }}>⠿</span>
                <span style={{ fontSize:11, flex:1, lineHeight:1.3,
                  color:isScheduled?"#9CA3AF":p?.color||"#374151",
                  textDecoration:isScheduled?"line-through":"none" }}>{task.text}</span>
              </div>
            );
          })}
          {/* Add extra task — no dropdown */}
          <div style={{ marginTop:10, borderTop:"1px solid #F3F4F6", paddingTop:10 }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#6B7280", marginBottom:6 }}>ADD TASK</div>
            <input value={newExtra} onChange={e=>setNewExtra(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addExtra()}
              placeholder="Task name…"
              style={{ width:"100%", fontSize:11, padding:"5px 8px", border:"1.5px solid #E5E7EB",
                borderRadius:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:5 }} />
            <button onClick={addExtra} style={{ ...btnDark, width:"100%", fontSize:11, padding:"5px 0" }}>+ Add to panel</button>
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex:1, overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", tableLayout:"fixed", width:50+DAYS.length*COL_W }}>
            <colgroup>
              <col style={{ width:50 }} />
              {DAYS.map(d=><col key={d} style={{ width:COL_W }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", fontSize:9, color:"#6B7280", padding:"6px 0" }}></th>
                {DAYS.map(d=><th key={d} style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", padding:"7px", fontSize:11, fontWeight:800, color:"#374151", letterSpacing:"0.08em" }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h=>(
                [0,1].map(half=>{
                  const si = (h-7)*2+half;
                  const isHour = half===0;
                  return (
                    <tr key={`${h}-${half}`} style={{ height:CELL_H }}>
                      <td style={{ fontSize:9, color:isHour?"#9CA3AF":"#D1D5DB", textAlign:"right",
                        padding:"0 6px", border:"1px solid #F3F4F6", background:"#FAFAF8", whiteSpace:"nowrap",
                        verticalAlign:"top", paddingTop:4 }}>
                        {isHour?(h<12?`${h}am`:h===12?"12pm":`${h-12}pm`):":30"}
                      </td>
                      {DAYS.map(day=>{
                        const key   = ck(day, si);
                        const block = gridBlocks[key];
                        const occBy = occupiedSlots[`${day}-${si}`];
                        const isEd  = inlineEdit===key;

                        if (occBy !== undefined) return null; // covered by block above

                        if (block) {
                          const p = getPriority(block.pid);
                          return (
                            <td key={day} rowSpan={block.slots}
                              style={{ border:`2px solid ${p?.color||"#E5E7EB"}`, padding:0,
                                verticalAlign:"top", background:p?.light||"#F0FDF4",
                                position:"relative", overflow:"visible" }}>
                              <div style={{ position:"relative", height:block.slots*CELL_H-4,
                                padding:"3px 6px", display:"flex", flexDirection:"column", justifyContent:"space-between", overflow:"hidden" }}>
                                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:4 }}>
                                  <span style={{ fontSize:10, color:p?.color, fontWeight:700, lineHeight:1.3, flex:1 }}>{block.text}</span>
                                  <button onClick={()=>removeBlock(key)} style={{ background:"none", border:"none",
                                    cursor:"pointer", color:p?.color, fontSize:11, padding:0, opacity:0.5, flexShrink:0 }}>×</button>
                                </div>
                                {block.slots>=2 && <div style={{ fontSize:8, color:p?.color, opacity:0.7 }}>{block.slots*30}min</div>}
                                {/* Resize handle */}
                                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:8,
                                  cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center" }}
                                  onMouseDown={e=>{
                                    e.preventDefault();
                                    const startY=e.clientY, origSlots=block.slots;
                                    const onMove=mv=>{
                                      const delta=Math.round((mv.clientY-startY)/CELL_H);
                                      const ns=Math.max(1,Math.min(10,origSlots+delta));
                                      const next={...gridBlocks,[key]:{...block,slots:ns}};
                                      updateGridBlocks(next);
                                    };
                                    const onUp=()=>{ window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
                                    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
                                  }}>
                                  <div style={{ width:28, height:3, borderRadius:2, background:p?.color, opacity:0.35 }} />
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={day}
                            onDragOver={e=>e.preventDefault()}
                            onDrop={e=>{ e.preventDefault(); dropOnSlot(day,si); }}
                            onClick={()=>{ if(!inlineEdit){ setInlineEdit(key); setInlineVal(""); } }}
                            style={{ border:`1px solid ${isHour?"#F3F4F6":"#F9F9F9"}`,
                              background:"#fff", cursor:"pointer", verticalAlign:"top",
                              borderTop:!isHour?"1px dashed #F3F4F6":undefined }}>
                            {isEd && (
                              <div onClick={e=>e.stopPropagation()} style={{ padding:"2px 3px" }}>
                                <input autoFocus value={inlineVal}
                                  onChange={e=>setInlineVal(e.target.value)}
                                  onKeyDown={e=>{ if(e.key==="Enter") saveInline(day,si); if(e.key==="Escape") setInlineEdit(null); }}
                                  placeholder="Task…"
                                  style={{ width:"100%", fontSize:10, border:"1px solid #2563EB", borderRadius:3,
                                    padding:"2px 4px", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                                <button onClick={()=>saveInline(day,si)} style={{ marginTop:2, fontSize:9, padding:"1px 6px",
                                  background:"#111827", color:"#fff", border:"none", borderRadius:3, cursor:"pointer", fontFamily:"inherit" }}>✓</button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const streamColor = label => { const p=PRIORITIES.find(p=>p.label===label); return p?.color||"#6B7280"; };
const streamLight = label => { const p=PRIORITIES.find(p=>p.label===label); return p?.light||"#F3F4F6"; };

const RetroSection = ({ title, icon, sectionKey, borderColor, org, editingId, setEditingId, editVal, setEditVal, saveEdit, deleteCard }) => {
  if (!org) return null;
  const items = org[sectionKey] || []; if (!items.length) return null;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.1em", color:borderColor, marginBottom:8 }}>{icon} {title}</div>
      {items.map(item=>{
        const isEd = editingId===item.id;
        return (
          <div key={item.id} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 12px",
            marginBottom:5, borderRadius:8, background:streamLight(item.stream),
            border:`1px solid ${streamColor(item.stream)}33` }}>
            <span style={{ fontSize:12, marginTop:2, color:borderColor, flexShrink:0 }}>{icon}</span>
            <div style={{ flex:1 }}>
              {isEd ? (
                <div>
                  <textarea autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Escape") setEditingId(null); }}
                    style={{ width:"100%", minHeight:70, fontSize:12, padding:"6px 8px",
                      border:`1.5px solid ${streamColor(item.stream)}`, borderRadius:6,
                      outline:"none", fontFamily:"inherit", boxSizing:"border-box",
                      resize:"vertical", lineHeight:1.6, color:"#374151" }} />
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    <button onClick={()=>saveEdit(sectionKey,item.id)} style={{...btnDark,fontSize:10,padding:"3px 10px"}}>Save</button>
                    <button onClick={()=>setEditingId(null)} style={{...btnGray,fontSize:10,padding:"3px 10px"}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <span onClick={()=>{ setEditingId(item.id); setEditVal(item.text); }}
                  style={{ fontSize:13, color:"#374151", lineHeight:1.5, cursor:"text", display:"block" }}>{item.text}</span>
              )}
            </div>
            <span style={{ fontSize:9, color:streamColor(item.stream), background:"#fff",
              border:`1px solid ${streamColor(item.stream)}44`, borderRadius:10, padding:"1px 8px",
              whiteSpace:"nowrap", alignSelf:"flex-start", marginTop:2 }}>{item.stream}</span>
            <button onClick={()=>deleteCard(sectionKey,item.id)}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#D1D5DB",
                fontSize:15, padding:0, lineHeight:1, alignSelf:"flex-start", flexShrink:0 }}
              onMouseEnter={e=>e.currentTarget.style.color="#EF4444"}
              onMouseLeave={e=>e.currentTarget.style.color="#D1D5DB"}>×</button>
          </div>
        );
      })}
    </div>
  );
};

// ─── SCREEN 5: RETRO ──────────────────────────────────────────────────────────
const RetroScreen = ({ rawNotes, updateRawNotes, organized, updateOrganized }) => {
  const [week,      setWeek]      = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editVal,   setEditVal]   = useState("");
  const wk = WEEK_DATES[week];

  const organizeWithAI = async () => {
    const raw = rawNotes[wk] || ""; if (!raw.trim()) return;
    setLoading(true);
    try {
      const resp = await callAI(`Organize these weekly notes into a structured retro. Work streams: ${PRIORITIES.map(p=>p.label).join(", ")}, Other.
Return ONLY raw JSON, no markdown:
{"got_done":[{"text":"item","stream":"Customer Engagements"}],"not_done":[{"text":"item","stream":"CDS"}],"lessons":[{"text":"lesson","stream":"Other"}]}
Notes: ${raw}`);
      const p = JSON.parse(resp.replace(/```json|```/g,"").trim());
      const addIds = arr => (arr||[]).map(i=>({...i,id:Date.now()+Math.random()}));
      const next = { ...organized, [wk]: { got_done:addIds(p.got_done), not_done:addIds(p.not_done), lessons:addIds(p.lessons) } };
      updateOrganized(next);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const deleteCard = (section, id) => {
    const org = organized[wk]; if (!org) return;
    const next = { ...organized, [wk]: { ...org, [section]: org[section].filter(i=>i.id!==id) } };
    updateOrganized(next);
  };

  const saveEdit = (section, id) => {
    const org = organized[wk]; if (!org) return;
    const next = { ...organized, [wk]: { ...org, [section]: org[section].map(i=>i.id===id?{...i,text:editVal}:i) } };
    updateOrganized(next);
    setEditingId(null);
  };

  const org = organized[wk];

  return (
    <div>
      <SectionHeader title="Weekly Retro" sub="Dump your notes · AI organizes · Click to edit · × to delete" />
      <WeekNav week={week} setWeek={setWeek} />
      <div style={{ display:"grid", gridTemplateColumns:org?"1fr 1fr":"1fr", gap:16, marginTop:16 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#6B7280", marginBottom:8 }}>YOUR RAW NOTES</div>
          <textarea value={rawNotes[wk]||""}
            onChange={e=>{ const next={...rawNotes,[wk]:e.target.value}; updateRawNotes(next); }}
            placeholder={"Dump everything here…\n\nE.g.:\n- Finally closed LA Metro scope, took 3 meetings\n- PATS demo went well but they want occupancy reports faster\n- Didn't finish Violet Live prototype\n- Lesson: block deep work earlier in the week"}
            style={{ width:"100%", minHeight:280, fontSize:13, border:"1.5px solid #E5E7EB", borderRadius:10,
              padding:"14px", resize:"vertical", outline:"none", fontFamily:"inherit",
              boxSizing:"border-box", color:"#374151", lineHeight:1.7, background:"#fff" }} />
          <button onClick={organizeWithAI} disabled={loading}
            style={{ marginTop:10, ...btnDark, background:loading?"#9CA3AF":"#111827",
              cursor:loading?"not-allowed":"pointer", fontSize:13, padding:"9px 20px" }}>
            {loading?"⏳ Organizing…":"✦ Clearly Organize with AI"}
          </button>
        </div>
        {org && (
          <div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", color:"#6B7280", marginBottom:4 }}>ORGANIZED — week of {wk}</div>
            <div style={{ fontSize:10, color:"#9CA3AF", fontStyle:"italic", marginBottom:12 }}>Click any item to edit · × to delete</div>
            <RetroSection title="GOT DONE"        icon="✓" sectionKey="got_done" borderColor="#059669" org={org} editingId={editingId} setEditingId={setEditingId} editVal={editVal} setEditVal={setEditVal} saveEdit={saveEdit} deleteCard={deleteCard} />
            <RetroSection title="DIDN'T GET DONE" icon="○" sectionKey="not_done" borderColor="#DC2626" org={org} editingId={editingId} setEditingId={setEditingId} editVal={editVal} setEditVal={setEditVal} saveEdit={saveEdit} deleteCard={deleteCard} />
            <RetroSection title="LESSONS LEARNED" icon="→" sectionKey="lessons"  borderColor="#D97706" org={org} editingId={editingId} setEditingId={setEditingId} editVal={editVal} setEditVal={setEditVal} saveEdit={saveEdit} deleteCard={deleteCard} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,      setScreen]      = useState(0);
  const [mergeTD,     setMergeTD]     = useState(() => load("merge_td", {}));
  const [parsed,      setParsed]      = useState(() => load("annual_parsed", {}));
  const [freeform,    setFreeform]    = useState(() => load("annual_freeform", {}));
  const [bottomUp,    setBottomUp]    = useState(() => load("merge_bu", {}));
  const [buFreeform,  setBuFreeform]  = useState(() => load("merge_bu_raw", {}));
  const [gridBlocks,  setGridBlocks]  = useState(() => load("tt_blocks", {}));
  const [extraTasks,  setExtraTasks]  = useState(() => load("tt_extra", []));
  const [scheduledIds,setScheduledIds]= useState(() => load("tt_scheduled_ids", []));
  const [rawNotes,    setRawNotes]    = useState(() => load("retro_raw", {}));
  const [organized,   setOrganized]   = useState(() => load("retro_org", {}));
  const [syncing,     setSyncing]     = useState(true);

  useEffect(() => {
    Promise.all([
      loadFromCloud("merge_td", {}),
      loadFromCloud("annual_parsed", {}),
      loadFromCloud("annual_freeform", {}),
      loadFromCloud("merge_bu", {}),
      loadFromCloud("merge_bu_raw", {}),
      loadFromCloud("tt_blocks", {}),
      loadFromCloud("tt_extra", []),
      loadFromCloud("tt_scheduled_ids", []),
      loadFromCloud("retro_raw", {}),
      loadFromCloud("retro_org", {}),
    ]).then(([md,pd,ff,bu,bur,gb,et,si,rn,og]) => {
      setMergeTD(md); setParsed(pd); setFreeform(ff);
      setBottomUp(bu); setBuFreeform(bur);
      setGridBlocks(gb); setExtraTasks(et); setScheduledIds(si);
      setRawNotes(rn); setOrganized(og);
      setSyncing(false);
    }).catch(() => setSyncing(false));
  }, []);

  const updateMergeTD   = v => { setMergeTD(v);      save("merge_td", v); };
  const updateParsed    = v => { setParsed(v);        save("annual_parsed", v); };
  const updateFreeform  = v => { setFreeform(v);      save("annual_freeform", v); };
  const updateBottomUp  = v => { setBottomUp(v);      save("merge_bu", v); };
  const updateBuFreeform= v => { setBuFreeform(v);    save("merge_bu_raw", v); };
  const updateGridBlocks= v => { setGridBlocks(v);    save("tt_blocks", v); };
  const updateExtraTasks= v => { setExtraTasks(v);    save("tt_extra", v); };
  const updateScheduled = v => { setScheduledIds(v);  save("tt_scheduled_ids", v); };
  const updateRawNotes  = v => { setRawNotes(v);      save("retro_raw", v); };
  const updateOrganized = v => { setOrganized(v);     save("retro_org", v); };

  const screens = [
    <AnnualScreen key="annual"
      parsed={parsed} updateParsed={updateParsed}
      freeform={freeform} updateFreeform={updateFreeform} />,
    <QuarterlyScreen key="quarterly"
      mergeTD={mergeTD} updateMergeTD={updateMergeTD}
      parsed={parsed} updateParsed={updateParsed} />,
    <WeeklyMergeScreen key="merge"
      mergeTD={mergeTD} updateMergeTD={updateMergeTD}
      bottomUp={bottomUp} updateBottomUp={updateBottomUp}
      buFreeform={buFreeform} updateBuFreeform={updateBuFreeform} />,
    <TimetableScreen key="timetable"
      mergeTD={mergeTD}
      gridBlocks={gridBlocks} updateGridBlocks={updateGridBlocks}
      extraTasks={extraTasks} updateExtraTasks={updateExtraTasks}
      scheduledIds={scheduledIds} updateScheduled={updateScheduled} />,
    <RetroScreen key="retro"
      rawNotes={rawNotes} updateRawNotes={updateRawNotes}
      organized={organized} updateOrganized={updateOrganized} />,
  ];

  return (
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif", background:"#F8F7F5", minHeight:"100vh", display:"flex" }}>
      <div style={{ width:180, background:"#111827", flexShrink:0, display:"flex", flexDirection:"column",
        padding:"24px 0", position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"0 20px 24px", borderBottom:"1px solid #374151" }}>
          <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#6B7280", textTransform:"uppercase", marginBottom:4 }}>Wi-Tronix</div>
          <div style={{ fontSize:14, fontWeight:800, color:"#F9FAFB" }}>My Planner</div>
          <div style={{ fontSize:9, color: syncing ? "#F59E0B" : "#10B981", marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background: syncing ? "#F59E0B" : "#10B981" }} />
            {syncing ? "Syncing…" : "Synced ✓"}
          </div>
        </div>
        <nav style={{ flex:1, padding:"16px 0" }}>
