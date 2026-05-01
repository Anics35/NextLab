import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  ShieldCheck, Play, Send, Layout, LogOut, 
  Terminal, Code2, BookOpen, ChevronRight
} from 'lucide-react';

// Services
import AuthForm from './components/AuthForm';
import TeacherDashboard from './components/TeacherDashboard';
import { runCode, submitCode, getProblems } from './services/codeService';
import { logout } from './services/authService';
import { socket, initSocket } from './services/socket';

const LANGUAGE_CONFIG = {
  javascript: { id: 63, label: 'JavaScript', defaultCode: '// Node.js\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf8");\n\nconsole.log(input);' },
  python: { id: 71, label: 'Python 3', defaultCode: '# Python 3\nimport sys\ninput_data = sys.stdin.read()\nprint(input_data)' },
  cpp: { id: 54, label: 'C++ (GCC 9.2)', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Standard I/O ready\n    return 0;\n}' },
  java: { id: 62, label: 'Java', defaultCode: 'import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}' }
};

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Data & Connect Socket[cite: 2]
  useEffect(() => {
    if (user && user.role === 'student') {
      const fetchAll = async () => {
        const data = await getProblems();
        setProblems(data || []);
        if (data?.length > 0) setSelectedProblem(data[0]);
      };
      fetchAll();
      initSocket(localStorage.getItem('token'));
    }
  }, [user]);

  // 2. Load Boilerplate when Problem or Language changes[cite: 2]
  useEffect(() => {
    if (selectedProblem) {
      const boilerplate = LANGUAGE_CONFIG[language].defaultCode;
      setCode(boilerplate);
      setResult(null);
      setOutput('');
    }
  }, [selectedProblem, language]);

  // 3. HARDENED SECURITY: Block Shortcuts (Ctrl+V, etc.)[cite: 2]
  const handleKeyDown = useCallback((e) => {
    const forbidden = ['c', 'v', 'x', 'u'];
    if ((e.ctrlKey || e.metaKey) && forbidden.includes(e.key.toLowerCase())) {
      e.preventDefault();
      toast.error(`Security: Ctrl+${e.key.toUpperCase()} blocked`, {
        style: { background: '#222', color: '#f87171', border: '1px solid #444' }
      });
      socket?.emit('proctor_event', { type: `shortcut_${e.key}`, time: new Date() });
    }
  }, []);

  // 4. Block Right-Click & Mouse Paste[cite: 2]
  const handleSecurity = useCallback((e) => {
    e.preventDefault();
    toast('Action Blocked: Secure Mode', { icon: '🛡️' });
    socket?.emit('proctor_event', { type: e.type, time: new Date() });
  }, []);

  // 5. Detect Tab Switches[cite: 2]
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        socket?.emit('tab_switch', { timestamp: new Date() });
        toast.error('Violation: Tab Switch Detected');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleRun = async () => {
    setIsProcessing(true);
    try {
      const res = await runCode(language, code, customInput);
      setOutput(res.output || res.error || "Execution Complete.");
    } catch (err) { setOutput("Runtime Error."); }
    finally { setIsProcessing(false); }
  };

  const handleSubmit = async () => {
    if (!selectedProblem) return;
    setIsProcessing(true);
    try {
      const res = await submitCode(selectedProblem._id, language, code);
      setResult(res);
      toast.success('Solution Submitted!');
    } catch (err) { toast.error("Submission failed."); }
    finally { setIsProcessing(false); }
  };

  if (!user) return <AuthForm onAuthSuccess={setUser} />;
  if (user.role === 'teacher') return <TeacherDashboard />;

  return (
    <div style={styles.appContainer} onKeyDown={handleKeyDown} tabIndex="0">
      <Toaster position="top-right" />
      
      {/* RESTORED SIDEBAR[cite: 2] */}
      <aside style={styles.sidebar}>
        <div style={styles.logoSquare}>N</div>
        <div style={styles.sidebarActions}>
          {problems.map((p, idx) => (
            <button 
              key={p._id} 
              onClick={() => setSelectedProblem(p)}
              style={{
                ...styles.sideBtn,
                backgroundColor: selectedProblem?._id === p._id ? '#ffa116' : '#333',
                color: selectedProblem?._id === p._id ? '#000' : '#fff'
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <button onClick={() => { logout(); setUser(null); }} style={styles.logoutBtn}><LogOut size={18} /></button>
      </aside>

      <main style={styles.mainContent}>
        {/* TOP NAVBAR */}
        <nav style={styles.navbar}>
          <div style={styles.navLeft}>
            <BookOpen size={16} color="#ffa116" />
            <span style={styles.pTitle}>{selectedProblem?.title || "Select a Problem"}</span>
          </div>
          <div style={styles.navCenter}>
             <button onClick={handleRun} disabled={isProcessing} style={styles.btnRun}><Play size={14} fill="#ffa116" color="#ffa116" /> Run</button>
             <button onClick={handleSubmit} disabled={isProcessing} style={styles.btnSub}><Send size={14} /> Submit</button>
          </div>
          <div style={styles.navRight}>
             <div style={styles.secureBadge}><ShieldCheck size={14} /> <span>SECURE MODE</span></div>
          </div>
        </nav>

        {/* 3-PANEL CONTENT[cite: 2] */}
        <div style={styles.grid}>
          {/* PANEL 1: DESCRIPTION */}
          <section style={styles.panelContainer}>
            <div style={styles.panelHeader}><Layout size={14} /> Description</div>
            <div style={styles.contentArea}>
              {selectedProblem ? (
                <>
                  <h2 style={styles.contentTitle}>{selectedProblem.title}</h2>
                  <p style={styles.descriptionText}>{selectedProblem.description}</p>
                  <div style={styles.sampleSection}>
                    <div style={styles.subLabel}>Public Samples</div>
                    {selectedProblem.testCases?.filter(t => t.isPublic).map((tc, i) => (
                      <div key={i} style={styles.sampleCard}>
                        <div style={{color: '#eff1f6'}}>Input: <span style={{color: '#888'}}>{tc.input}</span></div>
                        <div style={{color: '#ffa116', marginTop: '4px'}}>Output: <span style={{color: '#888'}}>{tc.expectedOutput}</span></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{color: '#444'}}>Select a problem from the sidebar to begin.</div>}
            </div>
          </section>

          {/* PANEL 2: EDITOR[cite: 2] */}
          <section style={styles.panelContainer} onCopy={handleSecurity} onPaste={handleSecurity} onContextMenu={handleSecurity}>
            <div style={styles.panelHeader}>
              <div style={{display: 'flex', gap: '15px', width: '100%', alignItems: 'center'}}>
                 <div style={{color: '#ffa116', display: 'flex', alignItems: 'center', gap: '5px'}}><Code2 size={14}/> Code</div>
                 <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.langSelect}>
                    {Object.keys(LANGUAGE_CONFIG).map(l => <option key={l} value={l}>{LANGUAGE_CONFIG[l].label}</option>)}
                 </select>
              </div>
            </div>
            <div style={{flex: 1, backgroundColor: '#1e1e1e'}}>
              <Editor 
                height="100%" 
                language={language} 
                theme="vs-dark" 
                value={code} 
                onChange={setCode} 
                options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 10 }, fontFamily: 'JetBrains Mono, monospace' }} 
              />
            </div>
          </section>

          {/* PANEL 3: CONSOLE */}
          <section style={styles.panelContainer}>
            <div style={styles.panelHeader}><Terminal size={14} /> Console</div>
            <div style={styles.terminalArea}>
              <div style={styles.subLabel}>Input Buffer</div>
              <textarea style={styles.inputArea} value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Enter test input..." />
              
              <div style={styles.subLabel}>Output Log</div>
              <div style={styles.outputBox}><pre>{output || '> Ready...'}</pre></div>

              {result && (
                <div style={{...styles.verdict, borderLeftColor: result.passed === result.total ? '#2cbb5d' : '#ef4444'}}>
                  <div style={{fontSize: '10px', color: '#444', fontWeight: 'bold'}}>VERDICT</div>
                  <div style={{fontSize: '18px', fontWeight: 'bold', color: result.passed === result.total ? '#2cbb5d' : '#ef4444'}}>
                     {result.passed} / {result.total} Passed
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: { display: 'flex', height: '100vh', backgroundColor: '#1a1a1a', color: '#eff1f6', overflow: 'hidden', outline: 'none' },
  sidebar: { width: '60px', backgroundColor: '#282828', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '15px' },
  logoSquare: { width: '32px', height: '32px', backgroundColor: '#ffa116', borderRadius: '6px', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' },
  sidebarActions: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' },
  sideBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s' },
  logoutBtn: { background: 'none', border: 'none', color: '#444', cursor: 'pointer', marginTop: 'auto' },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' },
  navbar: { height: '50px', backgroundColor: '#282828', borderRadius: '8px', marginBottom: '8px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  pTitle: { fontSize: '13px', fontWeight: '600' },
  navCenter: { display: 'flex', gap: '10px' },
  btnRun: { backgroundColor: '#333', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnSub: { backgroundColor: '#2cbb5d', border: 'none', color: '#fff', padding: '6px 16px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  navRight: { display: 'flex', alignItems: 'center' },
  secureBadge: { fontSize: '9px', fontWeight: '900', color: '#2cbb5d', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #2cbb5d33', padding: '4px 10px', borderRadius: '4px' },
  grid: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', height: '100%' },
  panelContainer: { backgroundColor: '#282828', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #333' },
  panelHeader: { height: '38px', backgroundColor: '#33333366', display: 'flex', alignItems: 'center', padding: '0 15px', fontSize: '10px', fontWeight: '900', gap: '10px', color: '#555', letterSpacing: '1px', textTransform: 'uppercase' },
  contentArea: { flex: 1, padding: '25px', overflowY: 'auto' },
  contentTitle: { fontSize: '20px', fontWeight: '800', marginBottom: '15px' },
  descriptionText: { fontSize: '14px', lineHeight: '1.7', color: '#bdc3c7', whiteSpace: 'pre-wrap' },
  subLabel: { fontSize: '10px', fontWeight: '900', color: '#444', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' },
  sampleSection: { marginTop: '35px' },
  sampleCard: { backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', marginBottom: '10px', border: '1px solid #333' },
  langSelect: { backgroundColor: '#1a1a1a', color: '#eff1f6', border: '1px solid #333', fontSize: '11px', cursor: 'pointer', outline: 'none', borderRadius: '4px', padding: '4px 8px' },
  terminalArea: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' },
  inputArea: { width: '100%', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '12px', resize: 'none', outline: 'none', marginBottom: '20px', minHeight: '100px' },
  outputBox: { flex: 1, backgroundColor: '#000', borderRadius: '8px', border: '1px solid #111', padding: '15px', color: '#2cbb5d', fontSize: '11px', fontFamily: 'monospace', overflowY: 'auto' },
  verdict: { marginTop: '15px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid' }
};

export default App;