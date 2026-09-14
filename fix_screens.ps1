$content = Get-Content src/App.jsx -Raw
$newScreens = "
function TrendsScreen() {
  const { data } = useContext(DataContext);
  if (!data) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} id='trends-report-pdf'>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <SectionTitle action={data.risk?.hyper_risk > 0.5 ? <Pill_ tone='warn'>Rising risk</Pill_> : null}>
            Next 3 hours &mdash; Forecast
          </SectionTitle>
          <button 
            onClick={() => window.print()}
            style={{ background: '#F6EDDD', color: '#C98A2C', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 500 }}
          >
            Export PDF
          </button>
        </div>

        {data.risk?.reason && (
          <div style={{ background: '#F5E5E3', padding: '12px 16px', borderRadius: 8, color: '#C1473D', fontFamily: 'IBM Plex Sans', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> <strong>AI Insight:</strong> {data.risk.reason}
          </div>
        )}

        <ResponsiveContainer width='100%' height={260}>
          <ComposedChart data={data.forecast || []} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke='#F1F3F2' />
            <ReferenceLine y={180} stroke='#EADFC8' strokeDasharray='3 3' />
            <ReferenceLine y={70} stroke='#EADFC8' strokeDasharray='3 3' />
            <XAxis dataKey='t' tick={{ fontFamily: 'IBM Plex Sans', fontSize: 11, fill: '#8A968F' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'IBM Plex Sans', fontSize: 11, fill: '#8A968F' }} axisLine={false} tickLine={false} domain={[50, 220]} />
            <Area type='monotone' dataKey='high' stroke='none' fill='#C98A2C' fillOpacity={0.08} />
            <Area type='monotone' dataKey='low' stroke='none' fill='#FFFFFF' fillOpacity={1} />
            <Line type='monotone' dataKey='actual' stroke='#114B4B' strokeWidth={2.5} dot={{ r: 3.5, fill: '#114B4B' }} connectNulls={false} />
            <Line type='monotone' dataKey='predicted' stroke='#C98A2C' strokeWidth={2} strokeDasharray='4 3' dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ display: 'flex', gap: 18 }}>
        <StatCard label='Avg. glucose (7d)' value={data.avg_glucose_7d || '—'} unit='mg/dL' icon={Droplet} />
        <StatCard label='Hypo events (7d)' value={data.hypo_events_7d || 0} unit='events' icon={AlertTriangle} />
        <StatCard label='Hyper events (7d)' value={data.hyper_events_7d || 0} unit='events' icon={TrendingUp} />
      </div>
      <style>{\
        @media print {
          body * { visibility: hidden; }
          #trends-report-pdf, #trends-report-pdf * { visibility: visible; }
          #trends-report-pdf { position: absolute; left: 0; top: 0; width: 100%; }
        }
      \}</style>
    </div>
  );
}

function MedicationsScreen() {
  const { token } = useContext(DataContext);
  const [meds, setMeds] = useState([]);
  
  useEffect(() => {
    fetch(\\/medications\, { headers: { Authorization: \Bearer \\ }})
      .then(r => r.json()).then(d => setMeds(d.data || [])).catch(console.error);
  }, [token]);

  const isPerfectToday = meds.length > 0 && meds.every(m => m.done);
  const streakDays = isPerfectToday ? 3 : 2;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Your Medications</SectionTitle>
        <div style={{ background: '#E6F1EC', color: '#3F8F6B', padding: '6px 12px', borderRadius: 20, fontFamily: 'IBM Plex Sans', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          ?? {streakDays} Day Streak!
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
        {meds.length === 0 && <div style={{ color: '#8A968F', fontSize: 13, fontFamily: 'IBM Plex Sans' }}>No medications found.</div>}
        {meds.map(m => (
          <div key={m.log_id || \\-\\} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid #F1F3F2', borderRadius: 12 }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 14, fontWeight: 600, color: '#17221F', textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.6 : 1 }}>{m.name}</div>
              <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 12.5, color: '#8A968F', marginTop: 4 }}>Scheduled for {m.time}</div>
            </div>
            <Pill_ tone={m.done ? 'good' : (m.status === 'missed' ? 'risk' : 'neutral')}>{m.done ? 'Taken' : (m.status === 'missed' ? 'Missed' : 'Pending')}</Pill_>
          </div>
        ))}
      </div>
    </Card>
  );
}
"
$final = $content -replace "function DietScreen\(\) \{", ($newScreens + "
function DietScreen() {")
[System.IO.File]::WriteAllText("src/App.jsx", $final, [System.Text.Encoding]::UTF8)
