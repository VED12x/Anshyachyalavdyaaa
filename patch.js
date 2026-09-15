const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add useRef to imports
content = content.replace(
  'import React, { useState, useEffect, createContext, useContext } from "react";',
  'import React, { useState, useEffect, createContext, useContext, useRef } from "react";'
);

// 2. Define CallOverlay component string
const callOverlayStr = `
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
      if (activeCall) return;
      try {
        const res = await fetch(\`\${API_URL}/calls/active\`, { headers: { Authorization: \`Bearer \${token}\` } });
        const data = await res.json();
        if (data.data && data.data.status === 'ringing' && data.data.recipient_id === userId) {
          setActiveCall(data.data);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeCall, userId]);

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
          await fetch(\`\${API_URL}/calls/signal\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
            body: JSON.stringify({ room_id: roomId, type: 'ice-candidate', data: event.candidate })
          });
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await fetch(\`\${API_URL}/calls/signal\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
          body: JSON.stringify({ room_id: roomId, type: 'offer', data: offer })
        });
      }

      const sigInterval = setInterval(async () => {
        const res = await fetch(\`\${API_URL}/calls/signal/\${roomId}\`, { headers: { Authorization: \`Bearer \${token}\` } });
        const sigData = await res.json();
        if (sigData.data && sigData.data.length > 0) {
          for (const sig of sigData.data) {
            if (sig.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await fetch(\`\${API_URL}/calls/signal\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
                body: JSON.stringify({ room_id: roomId, type: 'answer', data: answer })
              });
            } else if (sig.type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            } else if (sig.type === 'ice-candidate') {
              await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            }
          }
        }
        
        const activeRes = await fetch(\`\${API_URL}/calls/active\`, { headers: { Authorization: \`Bearer \${token}\` } });
        const activeData = await activeRes.json();
        if (!activeData.data || activeData.data.status === 'ended') {
           endCall(callId, pc, stream);
           clearInterval(sigInterval);
        }
      }, 2000);

      pc.sigInterval = sigInterval;
    } catch (e) {
      console.error('WebRTC Init Error:', e);
      alert('Could not access camera/microphone');
    }
  };

  const answerCall = async () => {
    if (!activeCall) return;
    try {
      await fetch(\`\${API_URL}/calls/\${activeCall.id}/answer\`, { method: 'PATCH', headers: { Authorization: \`Bearer \${token}\` } });
      const updatedCall = { ...activeCall, status: 'active' };
      setActiveCall(updatedCall);
      initWebRTC(updatedCall.id, updatedCall.room_id, false);
    } catch (e) {}
  };

  const endCall = async (callId = activeCall?.id, pc = peerConnection, stream = localStream) => {
    if (callId) {
      fetch(\`\${API_URL}/calls/\${callId}/end\`, { method: 'PATCH', headers: { Authorization: \`Bearer \${token}\` } }).catch(()=>{});
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

  useEffect(() => {
    const handleStartCall = async (e) => {
      const recipientId = e.detail;
      try {
        const res = await fetch(\`\${API_URL}/calls/initiate\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
          body: JSON.stringify({ recipient_id: recipientId, call_type: 'video' })
        });
        const d = await res.json();
        if (d.data) {
          setActiveCall(d.data);
          initWebRTC(d.data.id, d.data.room_id, true);
        }
      } catch (err) {}
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
            <button onClick={() => endCall()} style={{ background: '#DC2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 24, cursor: 'pointer', fontSize: 16 }}>
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;

// 3. Inject CallOverlay BEFORE `export default function App() {`
content = content.replace('export default function App() {', callOverlayStr + '\n\nexport default function App() {');

// 4. Inject `<CallOverlay />` inside the main App() return.
// We must find the EXACT `return (` that belongs to `App()`.
// Since App() is at the bottom, we find `if (loading) return <div>Loading...</div>;`
// and then the first `return (` after that.
const searchStr = 'if (loading) return <div style={{ padding: 40 }}>Loading...</div>;\n\n  return (';
const replaceStr = 'if (loading) return <div style={{ padding: 40 }}>Loading...</div>;\n\n  return (\n    <>\n      <CallOverlay token={token} userId={data?.id} />';
content = content.replace(searchStr, replaceStr);

// Close the fragment at the very end of App
const endAppStr = `    </DataContext.Provider>
  );
}`;
const endAppReplace = `    </DataContext.Provider>
    </>
  );
}`;
content = content.replace(endAppStr, endAppReplace);

// 5. Add call button to DoctorDashboard
const doctorHeaderStr = '<div style={{ fontSize: 24, fontWeight: 600, color: "#17221F" }}>{selectedPatient.name}</div>';
const doctorHeaderReplace = `<div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: "#17221F" }}>{selectedPatient.name}</div>
              <button onClick={() => window.dispatchEvent(new CustomEvent("start-telemed-call", { detail: selectedPatient.id }))} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer" }}>Video Call</button>
            </div>`;
content = content.replace(doctorHeaderStr, doctorHeaderReplace); // Wait, this will replace the div inside the <div style={{ display: "flex"...}}>

// 6. Add call button to CareScreen
const careScreenStr = `const [drMessages, setDrMessages] = useState([]);`;
const careScreenReplace = `const [drMessages, setDrMessages] = useState([]);\n  const handleCallDoctor = () => { if(providerId) window.dispatchEvent(new CustomEvent("start-telemed-call", { detail: providerId })); };`;
content = content.replace(careScreenStr, careScreenReplace);

const careTabStr = `<button onClick={() => setMode('doctor')} style={{ background: mode === 'doctor' ? '#fff' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontWeight: 600, color: mode === 'doctor' ? '#114B4B' : '#8A968F' }}>Doctor</button>`;
const careTabReplace = `<button onClick={() => setMode('doctor')} style={{ background: mode === 'doctor' ? '#fff' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontWeight: 600, color: mode === 'doctor' ? '#114B4B' : '#8A968F' }}>Doctor</button>
          {mode === 'doctor' && <button onClick={handleCallDoctor} style={{ background: "#114B4B", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 16, cursor: "pointer", fontWeight: 600, marginLeft: 10 }}>Call</button>}`;
content = content.replace(careTabStr, careTabReplace);

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('App.jsx successfully patched via Node');