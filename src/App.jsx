import React, { useState, useEffect, createContext, useContext } from "react";
import {
  LayoutGrid, TrendingUp, Pill, Utensils, Users, Settings, Bell,
  Droplet, Bluetooth, Sparkles, Check, Clock, AlertTriangle, ChevronRight,
  Send, User, Search, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
  Line, ComposedChart, CartesianGrid
} from "recharts";

const fs = require('fs');

const dashboardsCode = 
function RelativeDashboard({ token, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch(\\/relative/patients\, { headers: { Authorization: \Bearer \\ } })
      .then(r => r.json()).then(d => {
        setPatients(d.data || []);
        if (d.data?.length > 0) {
          fetch(\\/relative/patients/\/summary\, { headers: { Authorization: \Bearer \\ } })
            .then(r => r.json()).then(s => setSummary(s.data));
        }
      });
  }, [token]);

  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <h2>Relative View</h2>
          {patients.length > 0 && <p>Monitoring {patients[0].name}</p>}
        </div>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      {summary ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <Card style={{ flex: 1 }}>
              <h3>Current Glucose</h3>
              <p style={{ fontSize: 32, fontWeight: "bold", color: "#114B4B" }}>{summary.latest_glucose || '—'} mg/dL</p>
            </Card>
            <Card style={{ flex: 1 }}>
              <h3>Recent Alerts</h3>
              {summary.recent_alerts?.map((a, i) => <div key={i}><Pill_ tone="warn">{a.type}</Pill_> {a.message}</div>)}
            </Card>
          </div>
          <Card>
            <h3>Diet (Limited View)</h3>
            {summary.recent_meals?.length > 0 ? summary.recent_meals.map((m, i) => <div key={i}>{m.description}</div>) : <p>Diet details not shared or empty.</p>}
          </Card>
        </div>
      ) : <p>Loading...</p>}
    </div>
  );
}

function DoctorDashboard({ token, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [escalations, setEscalations] = useState([]);

  useEffect(() => {
    fetch(\\/doctor/patients\, { headers: { Authorization: \Bearer \\ } })
      .then(r => r.json()).then(d => setPatients(d.data || []));
    fetch(\\/doctor/escalations\, { headers: { Authorization: \Bearer \\ } })
      .then(r => r.json()).then(d => setEscalations(d.data || []));
  }, [token]);

  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2>Doctor Portal</h2>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <Card style={{ flex: 2 }}>
          <h3>My Patients</h3>
          <table style={{ width: "100%", textAlign: "left", marginTop: 10 }}>
            <thead><tr><th>Name</th><th>Email</th><th>Type</th></tr></thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id}><td>{p.name}</td><td>{p.email}</td><td>{p.diabetes_type}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card style={{ flex: 1 }}>
          <h3>Escalations</h3>
          {escalations.length === 0 ? <p>No urgent escalations.</p> : escalations.map(e => (
            <div key={e.id} style={{ padding: 10, borderBottom: "1px solid #eee" }}>
              <strong>{e.patient_name}</strong> requires attention.
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [sysHealth, setSysHealth] = useState(null);
  const [auditReason, setAuditReason] = useState("Support ticket #1234");
  const [viewedPatient, setViewedPatient] = useState(null);

  useEffect(() => {
    fetch(\\/admin/users\, { headers: { Authorization: \Bearer \\ } })
      .then(r => r.json()).then(d => setUsers(d.data || []));
    fetch(\\/admin/system-health\, { headers: { Authorization: \Bearer \\ } })
      .then(r => r.json()).then(d => setSysHealth(d.data));
  }, [token]);

  const deactivate = async (id) => {
    await fetch(\\/admin/users/\/deactivate\, { method: 'PATCH', headers: { Authorization: \Bearer \\ } });
    setUsers(users.map(u => u.id === id ? { ...u, role: 'deactivated' } : u));
  };

  const viewPatient = async (id) => {
    const res = await fetch(\\/admin/patients/\?reason=\\, { headers: { Authorization: \Bearer \\ } });
    if (!res.ok) return alert('Failed to view patient (ensure reason > 5 chars)');
    const d = await res.json();
    setViewedPatient(d.data);
    alert('Audit log written! Patient: ' + d.data.patient.name);
  };

  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2>Admin Console</h2>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      
      {sysHealth && (
        <Card style={{ marginBottom: 20 }}>
          <strong>System Status:</strong> {sysHealth.status.toUpperCase()} &bull; Uptime: {Math.round(sysHealth.uptime)}s
        </Card>
      )}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>User Management</h3>
          <input value={auditReason} onChange={e => setAuditReason(e.target.value)} placeholder="Audit reason..." style={{ padding: 5 }} />
        </div>
        <table style={{ width: "100%", textAlign: "left", marginTop: 10 }}>
          <thead><tr><th>Name</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.role === 'deactivated' ? 0.5 : 1 }}>
                <td>{u.name}</td>
                <td><Pill_ tone={u.role === 'admin' ? "warn" : "neutral"}>{u.role}</Pill_></td>
                <td>
                  {u.role === 'patient' && <button onClick={() => viewPatient(u.id)} style={{ marginRight: 10 }}>Audit View</button>}
                  {u.role !== 'deactivated' && <button onClick={() => deactivate(u.id)}>Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
;

let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

// Replace the old dummy components with the new code
const startStr = "function RelativeDashboard({ token, onLogout }) {";
const endStr = "function Pill_({ children, tone = \"neutral\" }) {";

const startIndex = appJsx.indexOf(startStr);
const endIndex = appJsx.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const finalJsx = appJsx.substring(0, startIndex) + dashboardsCode + "\n\n" + appJsx.substring(endIndex);
  fs.writeFileSync('src/App.jsx', finalJsx);
  console.log("App.jsx successfully patched!");
} else {
  console.error("Could not find replacement boundaries in App.jsx");
}


function Pill_({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#EEF1F0", fg: "#5C6B66" },
    good: { bg: "#E6F1EC", fg: "#3F8F6B" },
    warn: { bg: "#F6EDDD", fg: "#B8863A" },
    risk: { bg: "#F5E5E3", fg: "#C1473D" },
  };
  const t = tones[tone];
  return (
    <span style={{ background: t.bg, color: t.fg, fontFamily: "IBM Plex Sans", fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E7ECEA", borderRadius: 18, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, tone, icon: Icon }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "IBM Plex Sans", fontSize: 12, color: "#8A968F" }}>{label}</span>
        <Icon size={15} color="#B7C0BB" />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: "Fraunces", fontSize: 30, fontWeight: 600, color: "#17221F" }}>{value}</span>
        {unit && <span style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F" }}>{unit}</span>}
      </div>
      {tone && <Pill_ tone={tone.tone}>{tone.label}</Pill_>}
    </Card>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <span style={{ fontFamily: "IBM Plex Sans", fontSize: 13.5, fontWeight: 600, color: "#17221F" }}>{children}</span>
      {action}
    </div>
  );
}

function OverviewScreen() {
  const { data } = useContext(DataContext);
  if (!data) return <div>Loading...</div>;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard label="Current glucose" value={data.current_glucose?.value || "â€”"} unit="mg/dL" tone={{ tone: "good", label: "In range" }} icon={Droplet} />
        <StatCard label="Time in range (7d)" value={data.time_in_range || "0"} unit="%" tone={{ tone: "good", label: "Stable" }} icon={TrendingUp} />
        <StatCard label="Estimated HbA1c" value={data.estimated_hba1c || "â€”"} unit="%" tone={{ tone: "warn", label: "Watch trend" }} icon={Sparkles} />
        <StatCard label="Adherence" value={data.adherence || "â€”"} unit="%" tone={{ tone: "good", label: "On track" }} icon={Pill} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, alignItems: "start" }}>
        <Card>
          <SectionTitle action={<div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A968F" }}><Bluetooth size={12} /><span style={{ fontFamily: "IBM Plex Sans", fontSize: 11 }}>Synced just now</span></div>}>
            Today's Readings
          </SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.glucose_history || []} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="glowWeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#114B4B" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#114B4B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F3F2" />
              <ReferenceLine y={180} stroke="#EADFC8" strokeDasharray="3 3" />
              <ReferenceLine y={70} stroke="#EADFC8" strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fontFamily: "IBM Plex Sans", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: "IBM Plex Sans", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} domain={[50, 200]} />
              <Area type="monotone" dataKey="v" stroke="#114B4B" strokeWidth={2.5} fill="url(#glowWeb)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "linear-gradient(135deg, #114B4B, #1B6363)", borderRadius: 18, padding: 18, color: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Sparkles size={14} color="#E9C883" />
              <span style={{ fontFamily: "IBM Plex Sans", fontSize: 11, fontWeight: 600, color: "#E9C883", letterSpacing: 0.3 }}>PREDICTIVE INSIGHT</span>
            </div>
            <div style={{ fontFamily: "Fraunces", fontSize: 16.5, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
              {data.risk?.reason || "More data needed for insights."}
            </div>
            <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
              Powered by ML model: {data.risk?.model_version || "N/A"}
            </div>
          </div>

          <Card>
            <SectionTitle>Today's medication</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 13, color: "#17221F" }}>
                Taken: {data.today_medication?.taken || 0} / {data.today_medication?.total || 0}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrendsScreen() {
  const { data } = useContext(DataContext);
  if (!data) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionTitle action={data.risk?.hyper_risk > 0.5 ? <Pill_ tone="warn">Rising risk</Pill_> : null}>Next 3 hours &mdash; Forecast</SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data.forecast || []} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke="#F1F3F2" />
            <ReferenceLine y={180} stroke="#EADFC8" strokeDasharray="3 3" />
            <ReferenceLine y={70} stroke="#EADFC8" strokeDasharray="3 3" />
            <XAxis dataKey="t" tick={{ fontFamily: "IBM Plex Sans", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: "IBM Plex Sans", fontSize: 11, fill: "#8A968F" }} axisLine={false} tickLine={false} domain={[50, 220]} />
            <Area type="monotone" dataKey="high" stroke="none" fill="#C98A2C" fillOpacity={0.08} />
            <Area type="monotone" dataKey="low" stroke="none" fill="#FFFFFF" fillOpacity={1} />
            <Line type="monotone" dataKey="actual" stroke="#114B4B" strokeWidth={2.5} dot={{ r: 3.5, fill: "#114B4B" }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" stroke="#C98A2C" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ display: "flex", gap: 18 }}>
        <StatCard label="Avg. glucose (7d)" value={data.avg_glucose_7d || "â€”"} unit="mg/dL" icon={Droplet} />
        <StatCard label="Hypo events (7d)" value={data.hypo_events_7d || 0} unit="events" icon={AlertTriangle} />
        <StatCard label="Hyper events (7d)" value={data.hyper_events_7d || 0} unit="events" icon={TrendingUp} />
      </div>
    </div>
  );
}

function MedicationsScreen() {
  const { token } = useContext(DataContext);
  const [meds, setMeds] = useState([]);
  
  useEffect(() => {
    fetch(`${API_URL}/medications`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => setMeds(d.data || [])).catch(console.error);
  }, [token]);

  return (
    <Card>
      <SectionTitle>Your Medications</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meds.length === 0 && <div style={{ color: "#8A968F", fontSize: 13, fontFamily: "IBM Plex Sans" }}>No medications found.</div>}
        {meds.map(m => (
          <div key={m.log_id || `${m.id}-${m.time}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", border: "1px solid #F1F3F2", borderRadius: 12 }}>
            <div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F", textDecoration: m.done ? "line-through" : "none", opacity: m.done ? 0.6 : 1 }}>{m.name}</div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F", marginTop: 4 }}>Scheduled for {m.time}</div>
            </div>
            <Pill_ tone={m.done ? "good" : (m.status === "missed" ? "risk" : "neutral")}>{m.done ? "Taken" : (m.status === "missed" ? "Missed" : "Pending")}</Pill_>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DietScreen() {
  const { token } = useContext(DataContext);
  const [meals, setMeals] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/meals`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => setMeals(d.data || [])).catch(console.error);
  }, [token]);

  const addMeal = async (e) => {
    e.preventDefault();
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: input, logged_at: new Date().toISOString() })
      });
      const m = await res.json();
      
      const newMeal = {
        id: m.id,
        name: m.description,
        time: new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        carbs: m.estimated_carbs_g ? `${Math.round(m.estimated_carbs_g)}g carbs` : 'â€”',
        tag: m.tag || 'Pending',
        recommendation: m.recommendation,
        logged_at: m.logged_at,
        nutrition: { calories: m.calories }
      };
      setMeals([newMeal, ...meals]);
      setInput("");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionTitle>Log a Meal</SectionTitle>
        <form onSubmit={addMeal} style={{ display: "flex", gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="What did you eat? e.g., 2 rotis with dal" style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #E7ECEA", fontFamily: "IBM Plex Sans", fontSize: 13 }} />
          <button type="submit" disabled={loading} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "0 20px", borderRadius: 10, fontFamily: "IBM Plex Sans", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Analyzing via ML..." : "Log & Analyze"}
          </button>
        </form>
      </Card>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {meals.length === 0 && <div style={{ color: "#8A968F", fontSize: 13, fontFamily: "IBM Plex Sans", padding: 10 }}>No meals logged yet.</div>}
        {meals.map(m => (
          <Card key={m.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F" }}>{m.name}</div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F" }}>{m.time}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill_ tone="neutral">{m.carbs}</Pill_>
              <Pill_ tone={m.tag?.includes('High') ? "warn" : "good"}>{m.tag}</Pill_>
              <Pill_ tone="neutral">{m.nutrition?.calories || 0} kcal</Pill_>
            </div>
            {m.recommendation && (
              <div style={{ fontFamily: "Fraunces", fontSize: 14, color: "#114B4B", marginTop: 4, fontStyle: "italic", lineHeight: 1.4 }}>
                "{m.recommendation}"
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Message({ from, text }) {
  const mine = from === "me";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <div style={{ maxWidth: "70%", background: mine ? "#114B4B" : "#F5F6F4", color: mine ? "#fff" : "#17221F", borderRadius: 14, padding: "12px 16px", fontFamily: "IBM Plex Sans", fontSize: 13, lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}

function CareScreen() {
  const { token } = useContext(DataContext);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [menus, setMenus] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/chatbot/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(d => {
      const sessionId = d.data?.id;
      if (!sessionId) throw new Error("No session");
      return fetch(`${API_URL}/chatbot/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
    })
    .then(r => r.json())
    .then(d => {
      setSession(d.data.session);
      setMessages(d.data.messages);
      setMenus(d.data.menus);
    })
    .catch(e => console.error(e));
  }, [token]);

  const sendMessage = async (e, menuId = null) => {
    if (e) e.preventDefault();
    if (!input && !menuId) return;
    setLoading(true);
    const payload = menuId ? { menu_id: menuId } : { content: input };
    try {
      const res = await fetch(`${API_URL}/chatbot/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (res.ok) {
        setMessages([...messages, d.data.userMessage, d.data.botMessage]);
        setSession(d.data.session);
      } else {
        alert(d.error);
      }
    } catch (err) {
      console.error(err);
    }
    setInput('');
    setLoading(false);
  };

  if (!session) return <div style={{ padding: 40, textAlign: 'center' }}>Connecting to Support...</div>;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 500, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E7ECEA', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E7EFEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={20} color="#114B4B" />
        </div>
        <div>
          <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, fontWeight: 600, color: '#17221F' }}>DC360 Support Chat</div>
          <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A968F' }}>
            {session.status === 'bot_active' ? 'Automated Assistant' : `Escalated to ${session.escalation_target}`}
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {messages.map(m => (
          <Message key={m.id} from={m.sender === 'user' ? 'me' : 'dr'} text={m.content} />
        ))}
        {session.status === 'bot_active' && menus.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
            {menus.map(menu => (
              <button 
                key={menu.id} 
                onClick={() => sendMessage(null, menu.id)}
                disabled={loading}
                style={{ background: '#E7EFEE', color: '#114B4B', border: 'none', padding: '10px 16px', borderRadius: 16, cursor: 'pointer', fontFamily: 'IBM Plex Sans', fontWeight: 500 }}
              >
                {menu.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ padding: 20, borderTop: '1px solid #E7ECEA' }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10 }}>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading || session.status !== 'bot_active'}
            placeholder={session.status === 'bot_active' ? 'Or type your issue...' : 'Session escalated. A human will respond.'} 
            style={{ flex: 1, padding: '12px 16px', borderRadius: 20, border: '1px solid #E7ECEA', fontFamily: 'IBM Plex Sans', fontSize: 13 }} 
          />
          <button type="submit" disabled={loading || session.status !== 'bot_active'} style={{ background: '#114B4B', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: session.status !== 'bot_active' ? 0.5 : 1 }}>
            <Send size={16} color="#fff" />
          </button>
        </form>
      </div>
    </Card>
  );
}

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutGrid, Screen: OverviewScreen },
  { key: "trends", label: "Trends & Forecast", icon: TrendingUp, Screen: TrendsScreen },
  { key: "meds", label: "Medications", icon: Pill, Screen: MedicationsScreen },
  { key: "diet", label: "Diet", icon: Utensils, Screen: DietScreen },
  { key: "care", label: "Care Team", icon: Users, Screen: CareScreen },
];

const TITLES = {
  overview: ["Overview", "A snapshot of today's glucose, medication, and predictive insight"],
  trends: ["Trends & Forecast", "Glycemic patterns and the model's near-term prediction"],
  meds: ["Medications", "Schedule and adherence history"],
  diet: ["Diet", "Meal log and personalized nutrition guidance"],
  care: ["Care Team", "Stay connected with your clinician"],
};

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");

  const login = async (email) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" })
      });
      const d = await res.json();
      if (d.access_token) {
        setToken(d.access_token);
      } else {
        alert("Login failed");
      }
    } catch (e) {
      alert("Error connecting to API");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      const user = parseJwt(token);
      
      // If patient, fetch dashboard. For others, just dummy data for now
      // (Phases 12 and 13 will implement their real dashboards)
      if (user?.role === 'patient') {
        fetch(`${API_URL}/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(d => setData(d))
        .catch(e => console.error(e));
      } else {
        setData({ role: user?.role, dummy: true });
      }
    }
  }, [token]);

  if (!token) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F6F4" }}>
        <style>{`@import url('${FONT_LINK}'); * { box-sizing: border-box; }`}</style>
        <Card style={{ width: 400, textAlign: "center" }}>
          <h2 style={{ fontFamily: "Fraunces", color: "#114B4B" }}>DiabetesCare 360</h2>
          <p style={{ fontFamily: "IBM Plex Sans", color: "#8A968F", marginBottom: 20 }}>Select a role to continue</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => login("patient@demo.com")} disabled={loading} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontWeight: 600 }}>
              {loading ? "Connecting..." : "Log in as Patient"}
            </button>
            <button onClick={() => login("relative@demo.com")} disabled={loading} style={{ background: "#F6EDDD", color: "#B8863A", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontWeight: 600 }}>
              {loading ? "Connecting..." : "Log in as Relative"}
            </button>
            <button onClick={() => login("doctor@demo.com")} disabled={loading} style={{ background: "#E6F1EC", color: "#3F8F6B", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontWeight: 600 }}>
              {loading ? "Connecting..." : "Log in as Doctor"}
            </button>
            <button onClick={() => login("admin@demo.com")} disabled={loading} style={{ background: "#F5E5E3", color: "#C1473D", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontWeight: 600 }}>
              {loading ? "Connecting..." : "Log in as Admin"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const user = parseJwt(token);
  
  if (user?.role === 'relative') {
    return <RelativeDashboard token={token} onLogout={() => setToken(null)} />;
  }
  if (user?.role === 'doctor') {
    return <DoctorDashboard token={token} onLogout={() => setToken(null)} />;
  }
  if (user?.role === 'admin') {
    return <AdminDashboard token={token} onLogout={() => setToken(null)} />;
  }

  const Active = NAV.find((n) => n.key === tab).Screen;
  const [title, subtitle] = TITLES[tab];
  const userId = parseJwt(token)?.id;

  return (
    <DataContext.Provider value={{ data, token, userId }}>
      <div style={{ minHeight: "100vh", width: "100%", background: "#F5F6F4", display: "flex" }}>
        <style>{`@import url('${FONT_LINK}'); * { box-sizing: border-box; }`}</style>
        <aside style={{ width: 232, flexShrink: 0, background: "#FFFFFF", borderRight: "1px solid #E7ECEA", padding: "22px 14px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "#114B4B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Droplet size={15} color="#E9C883" />
            </div>
            <span style={{ fontFamily: "Fraunces", fontSize: 16.5, fontWeight: 600, color: "#17221F" }}>DC360</span>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {NAV.map(({ key, label, icon: Icon }) => {
              const active = key === tab;
              return (
                <button key={key} onClick={() => setTab(key)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11, border: "none", cursor: "pointer", textAlign: "left", background: active ? "#E7EFEE" : "transparent" }}>
                  <Icon size={16} color={active ? "#114B4B" : "#8A968F"} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ fontFamily: "IBM Plex Sans", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#114B4B" : "#5C6B66" }}>{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 32px 0" }}>
            <div>
              <div style={{ fontFamily: "Fraunces", fontSize: 24, fontWeight: 500, color: "#17221F" }}>{title}</div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F", marginTop: 3 }}>{subtitle}</div>
            </div>
            <button onClick={() => setToken(null)} style={{ background: "transparent", border: "1px solid #E7ECEA", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "IBM Plex Sans" }}>Log out</button>
          </header>
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 32px 40px" }}>
            {data ? <Active /> : <div style={{ padding: 40, textAlign: "center", color: "#8A968F", fontFamily: "IBM Plex Sans" }}>Fetching secure data from Render...</div>}
          </div>
        </main>
      </div>
    </DataContext.Provider>
  );
}



