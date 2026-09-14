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

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
const API_URL = "https://dc360-api.onrender.com";

const DataContext = createContext(null);

const parseJwt = (t) => {
  try { return JSON.parse(atob(t.split('.')[1])); } catch (e) { return null; }
};

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
        <StatCard label="Current glucose" value={data.current_glucose?.value || "—"} unit="mg/dL" tone={{ tone: "good", label: "In range" }} icon={Droplet} />
        <StatCard label="Time in range (7d)" value={data.time_in_range || "0"} unit="%" tone={{ tone: "good", label: "Stable" }} icon={TrendingUp} />
        <StatCard label="Estimated HbA1c" value={data.estimated_hba1c || "—"} unit="%" tone={{ tone: "warn", label: "Watch trend" }} icon={Sparkles} />
        <StatCard label="Adherence" value={data.adherence || "—"} unit="%" tone={{ tone: "good", label: "On track" }} icon={Pill} />
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
        <StatCard label="Avg. glucose (7d)" value={data.avg_glucose_7d || "—"} unit="mg/dL" icon={Droplet} />
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
      .then(r => r.json()).then(setMeds).catch(console.error);
  }, [token]);

  return (
    <Card>
      <SectionTitle>Your Medications</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meds.length === 0 && <div style={{ color: "#8A968F", fontSize: 13, fontFamily: "IBM Plex Sans" }}>No medications found.</div>}
        {meds.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", border: "1px solid #F1F3F2", borderRadius: 12 }}>
            <div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F" }}>{m.name}</div>
              <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F", marginTop: 4 }}>{m.dosage} &bull; {m.schedule_time}</div>
            </div>
            <Pill_ tone="good">Prescribed</Pill_>
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
      .then(r => r.json()).then(d => setMeals(d.meals || [])).catch(console.error);
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
      const newMeal = await res.json();
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
            <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F" }}>{m.description}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill_ tone="neutral">{m.estimated_carbs_g}g carbs</Pill_>
              <Pill_ tone="good">{m.tag}</Pill_>
              <Pill_ tone="neutral">{m.calories} kcal</Pill_>
            </div>
            {m.recommendation && (
              <div style={{ fontFamily: "Fraunces", fontSize: 14, color: "#114B4B", marginTop: 4, fontStyle: "italic" }}>
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
  const { token, userId } = useContext(DataContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/messages`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r => r.json()).then(setMessages).catch(console.error);
  }, [token]);

  const send = async (e) => {
    e.preventDefault();
    if (!input || messages.length === 0) return;
    
    // Find the clinician ID (the person who is not me)
    const clinicianMsg = messages.find(m => m.sender_id !== userId);
    const recipient = clinicianMsg ? clinicianMsg.sender_id : messages[0].recipient_id;

    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: input, recipient_id: recipient })
    });
    const newMsg = await res.json();
    setMessages([...messages, newMsg]);
    setInput("");
  };

  return (
    <Card style={{ display: "flex", flexDirection: "column", height: 500, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E7ECEA", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E7EFEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={20} color="#114B4B" />
        </div>
        <div>
          <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F" }}>Care Team Chat</div>
          <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12, color: "#8A968F" }}>Secure messaging</div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {messages.map(m => (
          <Message key={m.id} from={m.sender_id === userId ? "me" : "dr"} text={m.content} />
        ))}
      </div>
      
      <div style={{ padding: 20, borderTop: "1px solid #E7ECEA" }}>
        <form onSubmit={send} style={{ display: "flex", gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message your doctor..." style={{ flex: 1, padding: "12px 16px", borderRadius: 20, border: "1px solid #E7ECEA", fontFamily: "IBM Plex Sans", fontSize: 13 }} />
          <button type="submit" style={{ background: "#114B4B", color: "#fff", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
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

  const login = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "patient@demo.com", password: "password123" })
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
      fetch(`${API_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(d => setData(d))
      .catch(e => console.error(e));
    }
  }, [token]);

  if (!token) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F6F4" }}>
        <style>{`@import url('${FONT_LINK}'); * { box-sizing: border-box; }`}</style>
        <Card style={{ width: 400, textAlign: "center" }}>
          <h2 style={{ fontFamily: "Fraunces", color: "#114B4B" }}>DiabetesCare 360</h2>
          <p style={{ fontFamily: "IBM Plex Sans", color: "#8A968F", marginBottom: 20 }}>Connect to your Render API</p>
          <button onClick={login} disabled={loading} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "IBM Plex Sans", fontWeight: 600, width: "100%" }}>
            {loading ? "Connecting..." : "Log in as Patient (Demo)"}
          </button>
        </Card>
      </div>
    );
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
          </header>
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 32px 40px" }}>
            {data ? <Active /> : <div style={{ padding: 40, textAlign: "center", color: "#8A968F", fontFamily: "IBM Plex Sans" }}>Fetching secure data from Render...</div>}
          </div>
        </main>
      </div>
    </DataContext.Provider>
  );
}
