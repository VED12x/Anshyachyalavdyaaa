
function RelativeDashboard({ token, onLogout }) {
  // Dummy dashboard for relative (Phase 13)
  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2>Relative / Caregiver View</h2>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      <Card>
        <p>You are viewing limited patient details (Phase 13).</p>
      </Card>
    </div>
  );
}

function DoctorDashboard({ token, onLogout }) {
  // Dummy dashboard for doctor (Phase 12)
  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2>Doctor Portal</h2>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      <div style={{ display: "flex", gap: 20 }}>
        <Card style={{ flex: 1 }}><h3>Patients List</h3><p>Manage your linked patients.</p></Card>
        <Card style={{ flex: 1 }}><h3>Inbox</h3><p>Patient messages.</p></Card>
        <Card style={{ flex: 1 }}><h3>Escalations</h3><p>Chatbot escalations.</p></Card>
      </div>
    </div>
  );
}

function AdminDashboard({ token, onLogout }) {
  // Dummy dashboard for admin (Phase 12)
  return (
    <div style={{ padding: 40, fontFamily: "IBM Plex Sans", background: "#F5F6F4", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2>Admin Console</h2>
        <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Log out</button>
      </header>
      <div style={{ display: "flex", gap: 20 }}>
        <Card style={{ flex: 1 }}><h3>User Management</h3></Card>
        <Card style={{ flex: 1 }}><h3>System Health</h3></Card>
        <Card style={{ flex: 1 }}><h3>Food Database</h3></Card>
      </div>
    </div>
  );
}

