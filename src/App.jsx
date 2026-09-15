import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import {
  LayoutGrid, TrendingUp, Pill, Utensils, Users, Settings, Bell,
  Droplet, Bluetooth, Sparkles, Check, Clock, AlertTriangle, ChevronRight,
  Send, User, Search, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
  Line, ComposedChart, CartesianGrid
} from "recharts";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
const API_URL = "https://dc360-api.onrender.com";
const DataContext = createContext(null);

const parseJwt = (t) => {
  try { return JSON.parse(atob(t.split('.')[1])); } catch (e) { return null; }
};

function RelativeDashboard({ token, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/relative/patients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        setPatients(d.data || []);
        if (d.data?.length > 0) {
          fetch(`${API_URL}/relative/patients/${d.data[0].id}/summary`, { headers: { Authorization: `Bearer ${token}` } })
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
              <p style={{ fontSize: 32, fontWeight: "bold", color: "#114B4B" }}>{summary.latest_glucose || '-'} mg/dL</p>
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
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [meds, setMeds] = useState([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/doctor/patients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPatients(d.data || []));
    fetch(`${API_URL}/doctor/escalations`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setEscalations(d.data || []));
  }, [token]);

  const fetchPatientData = (pid) => {
    fetch(`${API_URL}/messages?with_user_id=${pid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.data) setMessages(d.data) });
    fetch(`${API_URL}/medications?patient_id=${pid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if(d.data) setMeds(d.data) });
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    fetchPatientData(p.id);
  };

  useEffect(() => {
    if (!selectedPatient) return;
    const interval = setInterval(() => {
      fetch(`${API_URL}/messages?with_user_id=${selectedPatient.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if(d.data) setMessages(d.data) });
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedPatient, token]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!msgInput) return;
    await fetch(`${API_URL}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ recipient_id: selectedPatient.id, content: msgInput })
    });
    setMsgInput('');
    fetchPatientData(selectedPatient.id);
  };

  const addMed = async (e) => {
    e.preventDefault();
    if(!newMedName || !newMedDose) return;
    await fetch(`${API_URL}/medications`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ patient_id: selectedPatient.id, name: newMedName, dosage: newMedDose, times_per_day: 1 })
    });
    setNewMedName(''); setNewMedDose('');
    fetchPatientData(selectedPatient.id);
  };

  const removeMed = async (medId) => {
    await fetch(`${API_URL}/medications/${medId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    fetchPatientData(selectedPatient.id);
  };

  if (selectedPatient) {
    return (
      <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <button onClick={() => setSelectedPatient(null)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: "#E7ECEA", border: "none" }}>&larr; Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#17221F" }}>{selectedPatient.name}</div>
              <button onClick={() => window.dispatchEvent(new CustomEvent("start-telemed-call", { detail: selectedPatient.id }))} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Video Call</button>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 30 }}>
          {/* Chat Panel */}
          <div style={{ flex: 2, background: "#fff", borderRadius: 16, padding: 25, boxShadow: "0 2px 10px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: 600 }}>
            <h3 style={{ margin: "0 0 20px" }}>Direct Messaging</h3>
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #E7ECEA", borderRadius: 8, padding: 15, marginBottom: 15, background: "#fafafa" }}>
              {messages.length === 0 && <div style={{ color: "#8A968F", textAlign: "center" }}>No messages yet.</div>}
              {messages.map(m => (
                <div key={m.id} style={{ marginBottom: 10, textAlign: m.from === "me" ? "right" : "left" }}>
                  <div style={{ display: "inline-block", padding: "8px 14px", borderRadius: 16, background: m.from === "me" ? "#114B4B" : "#E7EFEE", color: m.from === "me" ? "#fff" : "#17221F" }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #E7ECEA" }} />
              <button type="submit" style={{ padding: "10px 20px", borderRadius: 8, background: "#114B4B", color: "#fff", border: "none", cursor: "pointer" }}>Send</button>
            </form>
          </div>

          {/* Medications Panel */}
          <div style={{ flex: 1, background: "#fff", borderRadius: 16, padding: 25, boxShadow: "0 2px 10px rgba(0,0,0,0.02)", height: 600, overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px" }}>Medications</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {meds.length === 0 && <div style={{ color: "#8A968F" }}>No active medications.</div>}
              {meds.map(m => (
                <div key={m.id} style={{ padding: 12, border: "1px solid #E7ECEA", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "#8A968F" }}>{m.dosage} &bull; {m.done ? "Taken today" : "Pending"}</div>
                  </div>
                  <button onClick={() => removeMed(m.id)} style={{ padding: "4px 8px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>Remove</button>
                </div>
              ))}
            </div>
            <form onSubmit={addMed} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 15, background: "#F5F6F4", borderRadius: 8 }}>
              <h4 style={{ margin: 0 }}>Add New Medication</h4>
              <input value={newMedName} onChange={e => setNewMedName(e.target.value)} placeholder="Medication Name" style={{ padding: 8, borderRadius: 6, border: "1px solid #E7ECEA" }} />
              <input value={newMedDose} onChange={e => setNewMedDose(e.target.value)} placeholder="Dosage (e.g. 500mg)" style={{ padding: 8, borderRadius: 6, border: "1px solid #E7ECEA" }} />
              <button type="submit" style={{ padding: 8, background: "#114B4B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Prescribe</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#17221F" }}>Doctor Portal</div>
          <div style={{ color: "#8A968F" }}>Manage your patients and alerts</div>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "1px solid #E7ECEA", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>Log out</button>
      </header>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", padding: 25, borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 20px" }}>My Patients</h3>
          {patients.length === 0 ? (
            <div style={{ color: "#8A968F" }}>No patients linked yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F1F3F2" }}>
                    <td style={{ padding: "12px 0", fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: "12px 0", color: "#8A968F" }}>{p.diabetes_type}</td>
                    <td style={{ padding: "12px 0", textAlign: "right" }}>
                      <button onClick={() => selectPatient(p)} style={{ padding: "6px 12px", background: "#E7EFEE", color: "#114B4B", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ background: "#fff", padding: 25, borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 20px" }}>Recent Alerts</h3>
          {escalations.length === 0 ? (
            <div style={{ color: "#8A968F" }}>No active escalations.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {escalations.map(e => (
                <div key={e.id} style={{ padding: 15, background: "#FEE2E2", borderRadius: 8, color: "#DC2626" }}>
                  <strong>{e.patient_name}</strong> - {e.reason}
                </div>
              ))}
            </div>
          )}
        </div>
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
    fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUsers(d.data || []));
    fetch(`${API_URL}/admin/system-health`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setSysHealth(d.data));
  }, [token]);

  const deactivate = async (id) => {
    await fetch(`${API_URL}/admin/users/${id}/deactivate`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setUsers(users.map(u => u.id === id ? { ...u, role: 'deactivated' } : u));
  };

  const viewPatient = async (id) => {
    const res = await fetch(`${API_URL}/admin/patients/${id}?reason=${encodeURIComponent(auditReason)}`, { headers: { Authorization: `Bearer ${token}` } });
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

function Pill_({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#EEF1F0", fg: "#5C6B66" },
    good: { bg: "#E6F1EC", fg: "#3F8F6B" },
    warn: { bg: "#F6EDDD", fg: "#B8863A" },
    risk: { bg: "#F5E5E3", fg: "#C1473D" },
    info: { bg: "#E5F2F9", fg: "#2B7B9A" },
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
        <StatCard label="Current glucose" value={data.current_glucose?.value || "-"} unit="mg/dL" tone={{ tone: "good", label: "In range" }} icon={Droplet} />
        <StatCard label="Time in range (7d)" value={data.time_in_range || "0"} unit="%" tone={{ tone: "good", label: "Stable" }} icon={TrendingUp} />
        <StatCard label="Estimated HbA1c" value={data.estimated_hba1c || "-"} unit="%" tone={{ tone: "warn", label: "Watch trend" }} icon={Sparkles} />
        <StatCard label="Adherence" value={data.adherence || "-"} unit="%" tone={{ tone: "good", label: "On track" }} icon={Pill} />
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

function TrendsScreen() {
  const { data } = useContext(DataContext);
  if (!data) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle action={data.risk?.hyper_risk > 0.5 ? <Pill_ tone="warn">Rising risk</Pill_> : null}>Next 3 hours &mdash; Forecast</SectionTitle>
          <button style={{ padding: "6px 12px", background: "#114B4B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontSize: 12 }}>Export PDF (Phase 15)</button>
        </div>
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
        <StatCard label="Avg. glucose (7d)" value={data.avg_glucose_7d || "-"} unit="mg/dL" icon={Droplet} />
        <StatCard label="Hypo events (7d)" value={data.hypo_events_7d || 0} unit="events" icon={AlertTriangle} />
        <StatCard label="Hyper events (7d)" value={data.hyper_events_7d || 0} unit="events" icon={TrendingUp} />
      </div>
      <Card style={{ background: "linear-gradient(135deg, #114B4B, #1B6363)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <Sparkles size={14} color="#E9C883" />
          <span style={{ fontFamily: "IBM Plex Sans", fontSize: 11, fontWeight: 600, color: "#E9C883", letterSpacing: 0.3 }}>ML EXPLAINABILITY</span>
        </div>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, lineHeight: 1.5 }}>
          {data.risk?.reason || "Based on your recent glucose readings, the model predicts stable levels for the next 3 hours."}
        </div>
      </Card>
    </div>
  );
}

function MedicationsScreen() {
  const { token } = useContext(DataContext);
  const [meds, setMeds] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  
  const fetchMeds = () => {
    fetch(`${API_URL}/medications`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => setMeds(d.data || [])).catch(console.error);
  };

  useEffect(() => {
    fetchMeds();
  }, [token]);

  const addMed = async (e) => {
    e.preventDefault();
    if (!name || !dosage) return;
    try {
      await fetch(`${API_URL}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, dosage, times_per_day: 1 })
      });
      setShowAdd(false);
      setName('');
      setDosage('');
      fetchMeds();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
        <SectionTitle>Your Medications</SectionTitle>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: '#114B4B', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Sans' }}>
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addMed} style={{ display: 'flex', gap: 10, marginBottom: 20, padding: 15, background: '#F5F6F4', borderRadius: 12 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Medication Name" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E7ECEA' }} />
          <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Dosage (e.g. 500mg)" style={{ width: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid #E7ECEA' }} />
          <button type="submit" style={{ background: '#114B4B', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Save</button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meds.length === 0 && <div style={{ color: "#8A968F", fontSize: 13, fontFamily: "IBM Plex Sans" }}>No medications found.</div>}
        {meds.map(m => (
          <div key={m.log_id || `${m.id}-${m.time}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", border: "1px solid #F1F3F2", borderRadius: 12 }}>
            <div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F", textDecoration: m.done ? "line-through" : "none", opacity: m.done ? 0.6 : 1 }}>{m.name}</div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F", marginTop: 4 }}>Scheduled for {m.time} - {m.dosage || ''}</div>
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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/meals`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(d => setMeals(d.data || [])).catch(console.error);
  }, [token]);

  const addMeal = async (e) => {
    e.preventDefault();
    if (!input) return;
    setLoading(true);
    setSimulationResult(null);
    try {
      const res = await fetch(`${API_URL}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: input, logged_at: new Date().toISOString() })
      });
      const m = await res.json();
      const newMeal = {
        id: m.id,
        name: m.description,
        time: new Date(m.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        carbs: m.estimated_carbs_g ? `${Math.round(m.estimated_carbs_g)}g carbs` : '-',
        tag: m.tag || 'Pending',
        recommendation: m.recommendation,
        logged_at: m.logged_at,
        nutrition: { calories: m.calories }
      };
      setMeals([newMeal, ...meals]);
      setInput('');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const simulateMeal = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/meals/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: input })
      });
      const d = await res.json();
      setSimulationResult(d.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <SectionTitle>Diet & Meal Simulator</SectionTitle>
          <Pill_ tone="info">ML Powered</Pill_>
        </div>
        <form onSubmit={addMeal} style={{ display: 'flex', gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="What are you eating? e.g., 2 masala dosas" style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #E7ECEA', fontFamily: 'IBM Plex Sans', fontSize: 13 }} />
          <button type="button" onClick={simulateMeal} disabled={loading} style={{ background: '#F6EDDD', color: '#B8863A', border: 'none', padding: '0 16px', borderRadius: 10, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer' }}>
            What-If?
          </button>
          <button type="submit" disabled={loading} style={{ background: '#114B4B', color: '#fff', border: 'none', padding: '0 20px', borderRadius: 10, fontFamily: 'IBM Plex Sans', fontWeight: 600, cursor: 'pointer' }}>
            Log Meal
          </button>
        </form>
        {simulationResult && (
          <div style={{ marginTop: 15, padding: 15, background: '#E6F1EC', borderRadius: 10, color: '#3F8F6B', fontFamily: 'IBM Plex Sans', fontSize: 13 }}>
            <strong>Simulation Result:</strong> {simulationResult.estimated_carbs_g}g carbs ({simulationResult.tag}). {simulationResult.recommendation}
          </div>
        )}
      </Card>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {meals.length === 0 && <div style={{ color: '#8A968F', fontSize: 13, fontFamily: 'IBM Plex Sans', padding: 10 }}>No meals logged yet.</div>}
        {meals.map(m => (
          <Card key={m.id} style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 15, fontWeight: 600, color: '#17221F' }}>{m.name || m.description}</div>
                <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 13, color: '#8A968F', marginTop: 4 }}>
                  {m.carbs} &bull; {m.nutrition?.calories || 0} kcal &bull; {m.time}
                </div>
                {m.recommendation && (
                  <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12.5, color: '#3F8F6B', marginTop: 8, background: '#E6F1EC', padding: '6px 10px', borderRadius: 6 }}>
                    <Sparkles size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {m.recommendation}
                  </div>
                )}
              </div>
              <Pill_ tone={m.tag?.includes('High') ? 'warn' : 'good'}>{m.tag}</Pill_>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CareScreen() {
  const { token, userId } = useContext(DataContext);
  const [mode, setMode] = useState('bot');
  const [providerId, setProviderId] = useState(null);
  
  const [session, setSession] = useState(null);
  const [botMessages, setBotMessages] = useState([]);
  const [menus, setMenus] = useState([]);
  const [drMessages, setDrMessages] = useState([]);
  const handleCallDoctor = () => { if(providerId) window.dispatchEvent(new CustomEvent("start-telemed-call", { detail: providerId })); };
  
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
      setBotMessages(d.data.messages);
      setMenus(d.data.menus);
    })
    .catch(e => console.error(e));

    fetch(`${API_URL}/care-links`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.data?.length > 0) {
          const pid = d.data[0].provider_id;
          setProviderId(pid);
          return fetch(`${API_URL}/messages?with_user_id=${pid}`, { headers: { Authorization: `Bearer ${token}` } });
        }
      })
      .then(r => r && r.json())
      .then(d => {
        if (d?.data) setDrMessages(d.data);
      })
      .catch(e => console.error(e));
  }, [token]);

  useEffect(() => {
    if (mode !== 'doctor' || !providerId) return;
    const interval = setInterval(() => {
      fetch(`${API_URL}/messages?with_user_id=${providerId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if(d.data) setDrMessages(d.data) });
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, providerId, token]);

  const sendBotMessage = async (e, menuId = null) => {
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
        setBotMessages([...botMessages, d.data.userMessage, d.data.botMessage]);
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

  const sendDrMessage = async (e) => {
    e.preventDefault();
    if (!input || !providerId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient_id: providerId, content: input })
      });
      const d = await res.json();
      if (res.ok) {
        setDrMessages([...drMessages, d]);
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
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E7ECEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E7EFEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="#114B4B" />
          </div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, fontWeight: 600, color: '#17221F' }}>
              {mode === 'bot' ? 'DC360 Support Chat' : 'My Doctor'}
            </div>
            <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12, color: '#8A968F' }}>
              {mode === 'bot' ? (session.status === 'bot_active' ? 'Automated Assistant' : `Escalated to ${session.escalation_target}`) : 'Direct Message'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, background: '#F5F6F4', padding: 4, borderRadius: 20 }}>
          <button onClick={() => setMode('bot')} style={{ background: mode === 'bot' ? '#fff' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontWeight: 600, color: mode === 'bot' ? '#114B4B' : '#8A968F' }}>Bot</button>
          <button onClick={() => setMode('doctor')} style={{ background: mode === 'doctor' ? '#fff' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontWeight: 600, color: mode === 'doctor' ? '#114B4B' : '#8A968F' }}>Doctor</button>
          {mode === 'doctor' && <button onClick={handleCallDoctor} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 16, cursor: "pointer", fontWeight: 600, marginLeft: 10 }}>Call</button>}
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {mode === 'bot' ? (
          <>
            {botMessages.map(m => (
              <Message key={m.id} from={m.sender === 'user' ? 'me' : 'dr'} text={m.content} />
            ))}
            {session.status === 'bot_active' && menus.length > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                {menus.map(menu => (
                  <button 
                    key={menu.id} 
                    onClick={() => sendBotMessage(null, menu.id)}
                    disabled={loading}
                    style={{ background: '#E7EFEE', color: '#114B4B', border: 'none', padding: '10px 16px', borderRadius: 16, cursor: 'pointer', fontFamily: 'IBM Plex Sans', fontWeight: 500 }}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {drMessages.map(m => (
              <Message key={m.id} from={m.from === 'me' ? 'me' : 'dr'} text={m.text} />
            ))}
            {!providerId && <div style={{ color: '#8A968F', textAlign: 'center', marginTop: 20 }}>No active doctor linked.</div>}
          </>
        )}
      </div>
      
      <div style={{ padding: 20, borderTop: '1px solid #E7ECEA' }}>
        <form onSubmit={mode === 'bot' ? sendBotMessage : sendDrMessage} style={{ display: 'flex', gap: 10 }}>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading || (mode === 'bot' && session.status !== 'bot_active') || (mode === 'doctor' && !providerId)}
            placeholder={mode === 'bot' ? (session.status === 'bot_active' ? 'Or type your issue...' : 'Session escalated. A human will respond.') : 'Message your doctor...'} 
            style={{ flex: 1, padding: '12px 16px', borderRadius: 20, border: '1px solid #E7ECEA', fontFamily: 'IBM Plex Sans', fontSize: 13 }} 
          />
          <button type="submit" disabled={loading || (mode === 'bot' && session.status !== 'bot_active') || (mode === 'doctor' && !providerId)} style={{ background: '#114B4B', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: (mode === 'bot' && session.status !== 'bot_active') ? 0.5 : 1 }}>
            <Send size={16} color="#fff" />
          </button>
        </form>
      </div>
    </Card>
  );
}const NAV = [
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

function CallOverlay({ token, userId }) {
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  // Poll for incoming calls
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      if (activeCall) return; // Don't poll if already in a call
      try {
        const res = await fetch(`${API_URL}/calls/active`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.data && data.data.status === 'ringing' && data.data.recipient_id === userId) {
          setActiveCall(data.data);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeCall, userId]);

  // Handle setting streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream, activeCall]);

  const initWebRTC = async (callId, roomId, isInitiator) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      setPeerConnection(pc);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await fetch(`${API_URL}/calls/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ room_id: roomId, type: 'ice-candidate', data: event.candidate })
          });
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await fetch(`${API_URL}/calls/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ room_id: roomId, type: 'offer', data: offer })
        });
      }

      // Start polling for signals
      const sigInterval = setInterval(async () => {
        const res = await fetch(`${API_URL}/calls/signal/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
        const sigData = await res.json();
        if (sigData.data && sigData.data.length > 0) {
          for (const sig of sigData.data) {
            if (sig.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await fetch(`${API_URL}/calls/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ room_id: roomId, type: 'answer', data: answer })
              });
            } else if (sig.type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            } else if (sig.type === 'ice-candidate') {
              await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            }
          }
        }
        
        // Also check if call ended
        const activeRes = await fetch(`${API_URL}/calls/active`, { headers: { Authorization: `Bearer ${token}` } });
        const activeData = await activeRes.json();
        if (!activeData.data || activeData.data.status === 'ended') {
           endCall(callId, pc, stream);
           clearInterval(sigInterval);
        }
      }, 2000);

      // Store interval ID on pc object for cleanup
      pc.sigInterval = sigInterval;
    } catch (e) {
      console.error('WebRTC Init Error:', e);
      alert('Could not access camera/microphone');
    }
  };

  const answerCall = async () => {
    if (!activeCall) return;
    try {
      await fetch(`${API_URL}/calls/${activeCall.id}/answer`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      const updatedCall = { ...activeCall, status: 'active' };
      setActiveCall(updatedCall);
      initWebRTC(updatedCall.id, updatedCall.room_id, false);
    } catch (e) {
      console.error(e);
    }
  };

  const endCall = async (callId = activeCall?.id, pc = peerConnection, stream = localStream) => {
    if (callId) {
      fetch(`${API_URL}/calls/${callId}/end`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
    }
    if (pc) {
      if (pc.sigInterval) clearInterval(pc.sigInterval);
      pc.close();
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setActiveCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
  };

  // Expose initiate method via global window event
  useEffect(() => {
    const handleStartCall = async (e) => {
      const recipientId = e.detail;
      try {
        const res = await fetch(`${API_URL}/calls/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recipient_id: recipientId, call_type: 'video' })
        });
        const d = await res.json();
        if (d.data) {
          setActiveCall(d.data);
          initWebRTC(d.data.id, d.data.room_id, true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('start-telemed-call', handleStartCall);
    return () => window.removeEventListener('start-telemed-call', handleStartCall);
  }, [token]);

  if (!activeCall) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {activeCall.status === 'ringing' && activeCall.recipient_id === userId ? (
        <div style={{ background: '#fff', padding: 40, borderRadius: 20, textAlign: 'center' }}>
          <h2>Incoming Video Call</h2>
          <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
            <button onClick={() => endCall()} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>Decline</button>
            <button onClick={answerCall} style={{ background: '#114B4B', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>Accept</button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '80%', maxWidth: 1000, aspectRatio: '16/9', background: '#000', borderRadius: 20, overflow: 'hidden' }}>
          {!remoteStream && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff' }}>{activeCall.status === 'ringing' ? 'Calling...' : 'Connecting...'}</div>}
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 20, right: 20, width: 200, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12, border: '2px solid #fff' }} />
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
            <button onClick={() => endCall()} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 24, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <CallOverlay token={token} userId={token ? JSON.parse(atob(token.split(".")[1])).id : null} />`n    </DataContext.Provider>
  );
}









