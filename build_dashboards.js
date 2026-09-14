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
