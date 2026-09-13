import React, { useState } from "react";
import {
  LayoutGrid, TrendingUp, Pill, Utensils, Users, Settings, Bell,
  Droplet, Bluetooth, Sparkles, Check, Clock, AlertTriangle, ChevronRight,
  Send, User, Search
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine,
  Line, ComposedChart, CartesianGrid
} from "recharts";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&display=swap";

const glucoseHistory = [
  { t: "12a", v: 118 }, { t: "2a", v: 104 }, { t: "4a", v: 96 },
  { t: "6a", v: 101 }, { t: "8a", v: 142 }, { t: "10a", v: 131 },
  { t: "12p", v: 118 }, { t: "2p", v: 149 }, { t: "4p", v: 128 },
  { t: "6p", v: 121 }, { t: "8p", v: 133 }, { t: "now", v: 128 },
];

const forecast = [
  { t: "now", actual: 128, predicted: 128, low: 128, high: 128 },
  { t: "+30m", actual: null, predicted: 141, low: 130, high: 152 },
  { t: "+1h", actual: null, predicted: 159, low: 140, high: 178 },
  { t: "+90m", actual: null, predicted: 168, low: 144, high: 192 },
  { t: "+2h", actual: null, predicted: 152, low: 126, high: 178 },
  { t: "+2.5h", actual: null, predicted: 134, low: 108, high: 160 },
  { t: "+3h", actual: null, predicted: 121, low: 96, high: 146 },
];

const meds = [
  { name: "Metformin 500mg", time: "8:00 AM", done: true },
  { name: "Metformin 500mg", time: "8:00 PM", done: false },
  { name: "Vitamin D3", time: "8:00 AM", done: true },
];

const meals = [
  { name: "Breakfast — oats & almonds", time: "7:40 AM", carbs: "38g carbs", tag: "Balanced" },
  { name: "Lunch — dal, rice, salad", time: "1:10 PM", carbs: "62g carbs", tag: "Moderate" },
  { name: "Dinner — not logged yet", time: "Expected 7:30 PM", carbs: "—", tag: "Pending" },
];

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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard label="Current glucose" value="128" unit="mg/dL" tone={{ tone: "good", label: "In range" }} icon={Droplet} />
        <StatCard label="Time in range (7d)" value="78" unit="%" tone={{ tone: "good", label: "+4% this week" }} icon={TrendingUp} />
        <StatCard label="Estimated HbA1c" value="6.7" unit="%" tone={{ tone: "warn", label: "Watch trend" }} icon={Sparkles} />
        <StatCard label="Adherence" value="92" unit="%" tone={{ tone: "good", label: "On track" }} icon={Pill} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, alignItems: "start" }}>
        <Card>
          <SectionTitle action={<div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A968F" }}><Bluetooth size={12} /><span style={{ fontFamily: "IBM Plex Sans", fontSize: 11 }}>Synced 2 min ago</span></div>}>
            Last 24 hours
          </SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={glucoseHistory} margin={{ top: 4, right: 10, bottom: 0, left: -20 }}>
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
              Glucose tends to climb after 7&nbsp;pm meals.
            </div>
            <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.5 }}>
              A lighter dinner tonight could keep you in range. Full forecast under Trends.
            </div>
          </div>

          <Card>
            <SectionTitle>Today's medication</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {meds.map((m) => <MedRow key={m.name + m.time} {...m} />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MedRow({ name, time, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid #F1F3F2" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#3F8F6B" : "#F1F3F2", flexShrink: 0 }}>
        {done ? <Check size={13} color="#fff" /> : <Clock size={12} color="#8A968F" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, fontWeight: 500, color: "#17221F" }}>{name}</div>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 11, color: "#8A968F" }}>{time}</div>
      </div>
      {!done && <Pill_ tone="warn">Due</Pill_>}
    </div>
  );
}

function TrendsScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionTitle action={<Pill_ tone="warn">Rising risk</Pill_>}>Next 3 hours &mdash; LSTM forecast</SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={forecast} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
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
        <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
          <Legend swatch="#114B4B" label="Measured" />
          <Legend swatch="#C98A2C" label="Predicted" dashed />
        </div>
      </Card>

      <div style={{ background: "#F5E5E3", borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={18} color="#C1473D" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 13, color: "#7A2E28", lineHeight: 1.55 }}>
          Model estimates a <strong>68% chance</strong> of exceeding 180&nbsp;mg/dL around 8:30&nbsp;pm based on tonight's meal log and recent pattern.
        </div>
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        <StatCard label="Avg. glucose (7d)" value="126" unit="mg/dL" icon={Droplet} />
        <StatCard label="Hypo events (7d)" value="1" unit="event" icon={AlertTriangle} />
        <StatCard label="Hyper events (7d)" value="4" unit="events" icon={TrendingUp} />
      </div>
    </div>
  );
}

function Legend({ swatch, label, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 14, height: dashed ? 0 : 2, borderTop: dashed ? `2px dashed ${swatch}` : `2px solid ${swatch}` }} />
      <span style={{ fontFamily: "IBM Plex Sans", fontSize: 11.5, color: "#5C6B66" }}>{label}</span>
    </div>
  );
}

function MedicationsScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 18 }}>
        <StatCard label="Adherence (30d)" value="92" unit="%" tone={{ tone: "good", label: "On track" }} icon={Pill} />
        <StatCard label="Doses this week" value="12/14" icon={Check} />
        <StatCard label="Missed doses" value="2" tone={{ tone: "warn", label: "Review pattern" }} icon={Clock} />
      </div>
      <Card>
        <SectionTitle action={<button style={btnStyle}>Add medication</button>}>Schedule</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {meds.map((m) => <MedRow key={m.name + m.time + "b"} {...m} />)}
        </div>
      </Card>
    </div>
  );
}

function DietScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <SectionTitle action={<div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8A968F" }}><Sparkles size={13} /><span style={{ fontFamily: "IBM Plex Sans", fontSize: 11 }}>NLP dietary analysis</span></div>}>
          Today's meals
        </SectionTitle>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {meals.map((m) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: "1px solid #F1F3F2" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#E7EFEE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Utensils size={15} color="#114B4B" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "IBM Plex Sans", fontSize: 13, fontWeight: 500, color: "#17221F" }}>{m.name}</div>
                <div style={{ fontFamily: "IBM Plex Sans", fontSize: 11.5, color: "#8A968F" }}>{m.time} &middot; {m.carbs}</div>
              </div>
              <Pill_ tone={m.tag === "Pending" ? "neutral" : m.tag === "Balanced" ? "good" : "warn"}>{m.tag}</Pill_>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ background: "linear-gradient(135deg, #114B4B, #1B6363)", borderRadius: 18, padding: 18, color: "#fff" }}>
        <div style={{ fontFamily: "IBM Plex Sans", fontSize: 11, fontWeight: 600, color: "#E9C883", letterSpacing: 0.3 }}>DIETARY RECOMMENDATION</div>
        <div style={{ fontFamily: "Fraunces", fontSize: 16, marginTop: 8, lineHeight: 1.45 }}>
          Keep dinner carbs under 40g and pair with a short walk afterward to blunt the post-meal rise.
        </div>
      </div>
    </div>
  );
}

function CareScreen() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
      <Card style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#E7EFEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={24} color="#114B4B" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "IBM Plex Sans", fontSize: 14, fontWeight: 600, color: "#17221F" }}>Dr. Utkarsha Pacharney</div>
          <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12, color: "#8A968F" }}>Endocrinologist &middot; last reviewed 2 days ago</div>
        </div>
        <Pill_ tone="good">Sharing on</Pill_>
      </Card>
      <button style={{ ...btnStyle, justifyContent: "space-between", display: "flex", alignItems: "center" }}>
        Share full 30-day report <ChevronRight size={15} />
      </button>

      <Card style={{ gridColumn: "1 / -1" }}>
        <SectionTitle>Recent messages</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Message from="doctor" text="Your time-in-range improved this week — nice work. Let's keep the dinner portion smaller through the weekend." />
          <Message from="me" text="Will do. Should I still take the 8pm dose if I eat earlier?" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, borderTop: "1px solid #F1F3F2", paddingTop: 12 }}>
          <div style={{ flex: 1, background: "#F5F6F4", borderRadius: 999, padding: "10px 16px", fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F" }}>
            Message Dr. Pacharney&hellip;
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#114B4B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={14} color="#fff" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Message({ from, text }) {
  const mine = from === "me";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "60%", background: mine ? "#114B4B" : "#F5F6F4", color: mine ? "#fff" : "#17221F", borderRadius: 14, padding: "10px 14px", fontFamily: "IBM Plex Sans", fontSize: 13, lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}

const btnStyle = {
  background: "#114B4B", color: "#fff", border: "none", borderRadius: 10,
  padding: "9px 14px", fontFamily: "IBM Plex Sans", fontSize: 12.5, fontWeight: 600, cursor: "pointer"
};

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

export default function DiabetesCare360Web() {
  const [tab, setTab] = useState("overview");
  const Active = NAV.find((n) => n.key === tab).Screen;
  const [title, subtitle] = TITLES[tab];

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#F5F6F4", display: "flex" }}>
      <style>{`@import url('${FONT_LINK}'); * { box-sizing: border-box; }`}</style>

      <aside style={{ width: 232, flexShrink: 0, background: "#FFFFFF", borderRight: "1px solid #E7ECEA", padding: "22px 14px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "#114B4B", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Droplet size={15} color="#E9C883" />
          </div>
          <span style={{ fontFamily: "Fraunces", fontSize: 16.5, fontWeight: 600, color: "#17221F" }}>DiabetesCare 360</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = key === tab;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11,
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: active ? "#E7EFEE" : "transparent"
                }}
              >
                <Icon size={16} color={active ? "#114B4B" : "#8A968F"} strokeWidth={active ? 2.2 : 1.8} />
                <span style={{ fontFamily: "IBM Plex Sans", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? "#114B4B" : "#5C6B66" }}>{label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 11, border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <Settings size={16} color="#8A968F" />
            <span style={{ fontFamily: "IBM Plex Sans", fontSize: 13, fontWeight: 500, color: "#5C6B66" }}>Settings</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 32px 0" }}>
          <div>
            <div style={{ fontFamily: "Fraunces", fontSize: 24, fontWeight: 500, color: "#17221F" }}>{title}</div>
            <div style={{ fontFamily: "IBM Plex Sans", fontSize: 12.5, color: "#8A968F", marginTop: 3 }}>{subtitle}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E7ECEA", borderRadius: 10, padding: "8px 12px" }}>
              <Search size={14} color="#B7C0BB" />
              <span style={{ fontFamily: "IBM Plex Sans", fontSize: 12, color: "#B7C0BB" }}>Search</span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFFFFF", border: "1px solid #E7ECEA", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Bell size={15} color="#5C6B66" />
              <div style={{ position: "absolute", top: 8, right: 9, width: 6, height: 6, borderRadius: "50%", background: "#C1473D" }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#114B4B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "IBM Plex Sans", fontSize: 13, fontWeight: 600 }}>
              A
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 32px 40px" }}>
          <Active />
        </div>
      </main>
    </div>
  );
}
