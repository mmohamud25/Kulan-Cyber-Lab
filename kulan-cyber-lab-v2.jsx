import { useState, useRef, useEffect } from "react";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
// Replace YOUR_PROJECT_REF with your Supabase project reference ID
// e.g. if your project URL is https://abcxyz123.supabase.co → use abcxyz123
const SUPABASE_FUNCTION_URL = "https://xkadqvmqxdyqoddiypet.supabase.co/functions/v1/claude-proxy";

const COLORS = {
  navy: "#0B2545",
  teal: "#0D9488",
  gold: "#D97706",
  white: "#F8FAFB",
  dark: "#060F1E",
  darkCard: "#0D1B2E",
  border: "#1A3050",
  muted: "#4A6580",
};

const LAB_MODES = [
  {
    id: "ctf",
    label: "CTF Challenges",
    icon: "🚩",
    desc: "Capture-the-Flag style puzzles across cryptography, web exploitation, OSINT, and forensics.",
    color: COLORS.teal,
    domains: ["Cryptography", "Web Exploitation", "OSINT", "Forensics", "Reverse Engineering"],
  },
  {
    id: "simulation",
    label: "Guided Simulations",
    icon: "⚡",
    desc: "Step-by-step attack and defense scenarios. Learn by doing — phishing, malware, incident response.",
    color: COLORS.gold,
    domains: ["Phishing Attack", "Malware Analysis", "Incident Response", "Social Engineering", "Network Intrusion"],
  },
  {
    id: "secplus",
    label: "Security+ Labs",
    icon: "🛡️",
    desc: "Hands-on exercises mapped to CompTIA Security+ SY0-701 exam objectives.",
    color: "#7C3AED",
    domains: ["Domain 1: General Security", "Domain 2: Threats & Vulnerabilities", "Domain 3: Security Architecture", "Domain 4: Security Operations", "Domain 5: Governance & Compliance"],
  },
];

const SYSTEM_PROMPTS = {
  ctf: (topic) => `You are a CTF (Capture the Flag) cybersecurity instructor running a lab exercise on "${topic}". 

Create an engaging, realistic CTF challenge. Structure your response EXACTLY like this:

**CHALLENGE BRIEFING**
[2-3 sentences setting the scenario — make it feel real and immersive]

**OBJECTIVE**
[Clear statement of what the student must find or accomplish]

**GIVEN INFORMATION**
[Provide actual data: encoded strings, logs, code snippets, network output, etc. Make this realistic and detailed]

**HINTS AVAILABLE**
- Hint 1: [available on request]
- Hint 2: [available on request]

**SUBMISSION**
[Tell the student what format to submit their answer in, e.g. FLAG{...} or a specific value]

After the student submits an answer, evaluate it and explain whether it's correct. If wrong, guide them toward the solution without giving it away. If correct, explain the full solution and what they learned.`,

  simulation: (topic) => `You are a cybersecurity simulation instructor running a "${topic}" scenario.

Structure your response EXACTLY like this:

**SCENARIO BRIEFING**
[Immersive 2-3 sentence setup — you are an analyst, attacker, or defender in a real situation]

**YOUR ROLE**
[Define exactly who the student is in this scenario]

**SITUATION**
[Detailed current state with realistic technical details — IPs, logs, emails, system info, etc.]

**STEP 1 — YOUR FIRST DECISION**
What do you do next? Provide 3 numbered options for the student to choose from. Each option should be a realistic action a security professional might take.

After each student choice, continue the simulation realistically: show consequences, update the situation, and present the next decision point. Keep the scenario going for at least 5 decision points. At the end, provide a debrief with what the optimal path was and what was learned.`,

  secplus: (domain) => `You are a CompTIA Security+ SY0-701 lab instructor. Create a hands-on lab exercise for "${domain}".

Structure your response EXACTLY like this:

**LAB TITLE**
[Specific, descriptive title]

**EXAM OBJECTIVE COVERED**
[Specific SY0-701 objective number and description]

**LAB OVERVIEW**
[2-3 sentences describing what the student will practice]

**SCENARIO**
[Realistic workplace scenario with technical details — configs, logs, policies, network diagrams described in text]

**TASK LIST**
1. [Specific actionable task with details]
2. [Specific actionable task with details]
3. [Specific actionable task with details]
4. [Specific actionable task with details]
5. [Specific actionable task with details]

**QUESTIONS TO ANSWER**
Q1: [Direct question tied to the scenario]
Q2: [Direct question tied to the scenario]
Q3: [Direct question tied to the scenario]

**EXAM TIP**
[One key thing to remember for the actual Security+ exam related to this topic]

After the student answers the questions, evaluate each one and provide detailed explanations.`,
};

function TerminalText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idx.current = 0;
    const interval = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span style={{ animation: "blink 1s step-end infinite", color: COLORS.teal }}>█</span>}
    </span>
  );
}

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0D9488">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#D97706">$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#0B2545;color:#0D9488;padding:2px 6px;border-radius:4px;font-family:Share Tech Mono,monospace">$1</code>')
    .replace(/\n/g, "<br/>");
}

function Message({ role, content }) {
  const isUser = role === "user";
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      margin: "16px 0", flexDirection: isUser ? "row-reverse" : "row",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isUser ? COLORS.gold : COLORS.teal,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: COLORS.dark,
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        {isUser ? "YOU" : "AI"}
      </div>
      <div style={{
        maxWidth: "78%",
        background: isUser ? "#0B2545" : "#0D1B2E",
        border: `1px solid ${isUser ? COLORS.gold + "44" : COLORS.teal + "44"}`,
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "14px 18px", fontSize: 14, lineHeight: 1.75, color: COLORS.white,
        fontFamily: role === "assistant" ? "'Share Tech Mono', monospace" : "'Rajdhani', sans-serif",
        letterSpacing: role === "assistant" ? 0 : 0.3,
      }}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
      />
    </div>
  );
}

async function callClaude(system, messages) {
  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content?.[0]?.text ?? "No response received.";
}

export default function CyberLab() {
  const [screen, setScreen] = useState("home");
  const [activeMode, setActiveMode] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [labStarted, setLabStarted] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startLab = async (mode, topic) => {
    setActiveMode(mode);
    setActiveTopic(topic);
    setMessages([]);
    setLabStarted(false);
    setError(null);
    setScreen("lab");
    setLoading(true);
    try {
      const reply = await callClaude(
        SYSTEM_PROMPTS[mode.id](topic),
        [{ role: "user", content: "Start the lab." }]
      );
      setMessages([{ role: "assistant", content: reply }]);
      setLabStarted(true);
    } catch (err) {
      setError("Failed to start lab. Check your Edge Function deployment.");
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setError(null);
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const reply = await callClaude(
        SYSTEM_PROMPTS[activeMode.id](activeTopic),
        newMessages.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── HOME ────────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, color: COLORS.white, fontFamily: "'Rajdhani', sans-serif", overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');
        @keyframes blink { 50% { opacity: 0 } }
        @keyframes scanline { 0% { transform: translateY(-100%) } 100% { transform: translateY(100vh) } }
        @keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:1 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes gridMove { from { background-position: 0 0 } to { background-position: 40px 40px } }
        ::-webkit-scrollbar { width: 6px } ::-webkit-scrollbar-track { background: #060F1E } ::-webkit-scrollbar-thumb { background: #0D9488; border-radius: 3px }
        * { box-sizing: border-box; margin: 0; padding: 0 }
      `}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(${COLORS.teal}18 1px, transparent 1px), linear-gradient(90deg, ${COLORS.teal}18 1px, transparent 1px)`, backgroundSize: "40px 40px", animation: "gridMove 4s linear infinite" }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(transparent, ${COLORS.teal}88, transparent)`, animation: "scanline 6s linear infinite", zIndex: 1, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ padding: "40px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.navy})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: `1px solid ${COLORS.teal}66` }}>🔐</div>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: COLORS.teal, letterSpacing: 3 }}>KULAN INSTITUTE</div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>CYBER LAB</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: COLORS.muted }}>
            <span style={{ color: COLORS.teal, animation: "pulse 2s infinite" }}>●</span> AI ONLINE
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "60px 0 50px", animation: "fadeUp 0.7s ease" }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: COLORS.gold, letterSpacing: 4, marginBottom: 16 }}>// INTERACTIVE CYBERSECURITY TRAINING ENVIRONMENT</div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 20 }}>
            Learn by <span style={{ color: COLORS.teal, textShadow: `0 0 30px ${COLORS.teal}66` }}>Breaking</span> & <span style={{ color: COLORS.gold, textShadow: `0 0 30px ${COLORS.gold}66` }}>Defending</span>
          </h1>
          <p style={{ fontSize: 18, color: COLORS.muted, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6, fontWeight: 500 }}>
            AI-powered labs covering CTF challenges, real-world attack simulations, and Security+ SY0-701 exam prep. No setup required.
          </p>
          <button onClick={() => setScreen("select")} style={{ background: `linear-gradient(135deg, ${COLORS.teal}, #0A7A70)`, color: "#fff", border: "none", padding: "14px 36px", borderRadius: 8, fontFamily: "'Share Tech Mono', monospace", fontSize: 15, letterSpacing: 2, cursor: "pointer", transition: "all 0.2s", boxShadow: `0 4px 24px ${COLORS.teal}44` }}
            onMouseEnter={e => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.target.style.transform = "translateY(0)"}>
            ENTER LAB →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, paddingBottom: 60 }}>
          {LAB_MODES.map((m, i) => (
            <div key={m.id} onClick={() => { setScreen("select"); setActiveMode(m); }} style={{ background: COLORS.darkCard, border: `1px solid ${m.color}33`, borderRadius: 12, padding: "24px", cursor: "pointer", transition: "all 0.25s", animation: `fadeUp ${0.5 + i * 0.1}s ease` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 8px 32px ${m.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = m.color + "33"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{m.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, color: m.color }}>{m.label}</div>
              <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>{m.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", paddingBottom: 30, fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: COLORS.muted }}>kulaninstitute.org · mmohamud.me</div>
      </div>
    </div>
  );

  // ─── SELECT ──────────────────────────────────────────────────────────────────
  if (screen === "select") {
    const selectedMode = activeMode;
    return (
      <div style={{ minHeight: "100vh", background: COLORS.dark, color: COLORS.white, fontFamily: "'Rajdhani', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');
          @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
          * { box-sizing: border-box; margin:0; padding:0 }
          ::-webkit-scrollbar { width:6px } ::-webkit-scrollbar-thumb { background:#0D9488; border-radius:3px }
        `}</style>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ padding: "32px 0 28px", display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => { setScreen("home"); setActiveMode(null); }} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.muted, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 12 }}>← BACK</button>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", color: COLORS.teal, fontSize: 13, letterSpacing: 2 }}>SELECT LAB MODE</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {LAB_MODES.map(m => (
              <button key={m.id} onClick={() => setActiveMode(m)} style={{ background: selectedMode?.id === m.id ? m.color : "transparent", border: `1px solid ${m.color}`, color: selectedMode?.id === m.id ? COLORS.dark : m.color, padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, letterSpacing: 1, transition: "all 0.2s", fontWeight: 700 }}>
                {m.icon} {m.label.toUpperCase()}
              </button>
            ))}
          </div>
          {selectedMode && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: selectedMode.color, marginBottom: 8 }}>{selectedMode.label}</h2>
                <p style={{ color: COLORS.muted, fontSize: 15 }}>{selectedMode.desc}</p>
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: COLORS.muted, letterSpacing: 2, marginBottom: 14 }}>// SELECT A TOPIC TO BEGIN</div>
              <div style={{ display: "grid", gap: 10 }}>
                {selectedMode.domains.map((topic, i) => (
                  <div key={topic} onClick={() => startLab(selectedMode, topic)} style={{ background: COLORS.darkCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "18px 22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s", animation: `fadeUp ${0.2 + i * 0.05}s ease` }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = selectedMode.color; e.currentTarget.style.background = selectedMode.color + "11"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.darkCard; }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3 }}>{topic}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, fontFamily: "'Share Tech Mono', monospace" }}>AI-generated · interactive · adaptive</div>
                    </div>
                    <div style={{ color: selectedMode.color, fontSize: 18 }}>→</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: "16px 20px", background: COLORS.darkCard, borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted }}>
                <span style={{ color: selectedMode.color }}>⚡ AI-Powered: </span>Each lab is uniquely generated by Claude. No two sessions are the same.
              </div>
            </div>
          )}
          {!selectedMode && (
            <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.muted }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace" }}>Select a lab mode above to continue</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── LAB ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.dark, color: COLORS.white, fontFamily: "'Rajdhani', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap');
        @keyframes blink { 50% { opacity:0 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; margin:0; padding:0 }
        ::-webkit-scrollbar { width:5px } ::-webkit-scrollbar-thumb { background:#0D9488; border-radius:3px }
        textarea { resize: none; }
      `}</style>
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 16, background: COLORS.darkCard, flexShrink: 0 }}>
        <button onClick={() => { setScreen("select"); setMessages([]); setError(null); }} style={{ background: "none", border: `1px solid ${COLORS.border}`, color: COLORS.muted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "'Share Tech Mono', monospace", fontSize: 11 }}>← EXIT</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{activeMode?.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>{activeTopic}</div>
            <div style={{ fontSize: 11, color: activeMode?.color, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>{activeMode?.label?.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: COLORS.muted }}>
          <span style={{ color: COLORS.teal }}>●</span> SESSION ACTIVE
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {messages.length === 0 && loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: COLORS.muted }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${COLORS.teal}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}>
              <TerminalText text="Generating your lab environment..." />
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: "#2D0A0A", border: "1px solid #FF444444", borderRadius: 10, padding: "14px 18px", margin: "16px 0", color: "#FF6B6B", fontFamily: "'Share Tech Mono', monospace", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}
        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
        {loading && messages.length > 0 && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "16px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: COLORS.dark, fontFamily: "'Share Tech Mono', monospace", flexShrink: 0 }}>AI</div>
            <div style={{ background: COLORS.darkCard, border: `1px solid ${COLORS.teal}44`, borderRadius: "4px 16px 16px 16px", padding: "14px 18px", display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 8, height: 8, background: COLORS.teal, borderRadius: "50%", animation: `blink 1.2s ${d}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "16px 24px", background: COLORS.darkCard, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 900, margin: "0 auto" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={labStarted ? "Type your answer, question, or action... (Enter to send)" : "Waiting for lab to load..."}
            disabled={!labStarted || loading}
            rows={2}
            style={{ flex: 1, background: COLORS.dark, border: `1px solid ${input ? COLORS.teal + "88" : COLORS.border}`, color: COLORS.white, padding: "12px 16px", borderRadius: 10, outline: "none", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, lineHeight: 1.6, transition: "border-color 0.2s", opacity: labStarted ? 1 : 0.5 }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading || !labStarted} style={{ background: input.trim() && labStarted ? COLORS.teal : COLORS.border, border: "none", color: COLORS.dark, padding: "12px 22px", borderRadius: 10, cursor: input.trim() && labStarted ? "pointer" : "default", fontFamily: "'Share Tech Mono', monospace", fontSize: 13, fontWeight: 700, transition: "all 0.2s", letterSpacing: 1, flexShrink: 0, height: 48 }}>
            {loading ? "..." : "SEND →"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: COLORS.muted }}>
          kulaninstitute.org · mmohamud.me · Powered by Claude AI
        </div>
      </div>
    </div>
  );
}
