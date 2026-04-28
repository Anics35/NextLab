import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import AuthForm from './components/AuthForm';
import TeacherDashboard from './components/TeacherDashboard';
import { runCode, submitCode, getProblems } from './services/codeService';
import { logout } from './services/authService';
import { initSocket } from './services/socket';

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

  useEffect(() => {
    if (selectedProblem) {
      const header = `/**\n * Problem: ${selectedProblem.title}\n * Difficulty: ${selectedProblem.difficulty.toUpperCase()}\n */\n\n`;
      setCode(header + LANGUAGE_CONFIG[language].defaultCode);
      setResult(null);
      setOutput('');
      setCustomInput('');
    }
  }, [selectedProblem, language]);

  const handleRun = async () => {
    setIsProcessing(true);
    try {
      const res = await runCode(language, code, customInput);
      setOutput(res.output || res.error || "Execution Success.");
    } catch (err) { setOutput("Runtime Error."); }
    finally { setIsProcessing(false); }
  };

  const handleSubmit = async () => {
    if (!selectedProblem) return;
    setIsProcessing(true);
    try {
      const res = await submitCode(selectedProblem._id, language, code);
      setResult(res);
    } catch (err) { alert("Submission failed."); }
    finally { setIsProcessing(false); }
  };

  if (!user) return <AuthForm onAuthSuccess={setUser} />;
  if (user.role === 'teacher') return <TeacherDashboard />;

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>N</div>
        <div style={styles.pIcons}>
          {problems.map(p => (
            <div 
              key={p._id} 
              onClick={() => setSelectedProblem(p)} 
              style={{...styles.icon, backgroundColor: selectedProblem?._id === p._id ? '#007bff' : '#1a1a1a'}}
            >
              {p.title[0]}
            </div>
          ))}
        </div>
        <div onClick={() => { logout(); setUser(null); }} style={styles.logoutBtn}>⏻</div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.tag}>NEXLAB SECURE IDE</div>
            <h2 style={styles.pTitle}>{selectedProblem?.title || "Loading..."}</h2>
          </div>
          <div style={styles.controls}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.select}>
              {Object.keys(LANGUAGE_CONFIG).map(l => <option key={l} value={l}>{LANGUAGE_CONFIG[l].label}</option>)}
            </select>
            <button onClick={handleRun} style={styles.btnRun}>RUN</button>
            <button onClick={handleSubmit} style={styles.btnSub}>SUBMIT</button>
          </div>
        </header>

        <div style={styles.ideGrid}>
          <section style={styles.briefing}>
            <div style={styles.label}>SPECIFICATION</div>
            <p style={styles.desc}>{selectedProblem?.description}</p>
            
            <div style={styles.label} style={{marginTop: '30px'}}>PUBLIC SAMPLES</div>
            {selectedProblem?.testCases?.filter(t => t.isPublic === true).map((tc, i) => (
              <div key={i} style={styles.sampleBox}>
                <div style={styles.sampleText}><strong>Input:</strong> {tc.input}</div>
                <div style={{...styles.sampleText, color: '#4ade80', marginTop: '5px'}}><strong>Output:</strong> {tc.expectedOutput}</div>
              </div>
            )) || <div style={styles.noSamples}>No public samples provided.</div>}
          </section>

          <section style={styles.editorSec}>
            <Editor height="100%" language={language} theme="vs-dark" value={code} onChange={setCode} options={{ fontSize: 14, minimap: { enabled: false } }} />
          </section>

          <section style={styles.terminal}>
            <div style={styles.label}>STDIN</div>
            <textarea style={styles.stdin} value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Provide test input..." />
            <div style={styles.label}>STDOUT</div>
            <pre style={styles.stdout}>{output}</pre>
            {result && (
              <div style={{...styles.verdict, borderColor: result.passed === result.total ? '#4ade80' : '#f87171'}}>
                <div style={styles.vTitle}>VERDICT</div>
                <div style={styles.vScore}>{result.passed} / {result.total} Passed</div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '68px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' },
  logo: { width: '36px', height: '36px', backgroundColor: '#007bff', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', marginBottom: '40px' },
  pIcons: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' },
  icon: { width: '36px', height: '36px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', cursor: 'pointer', transition: '0.2s' },
  logoutBtn: { color: '#333', cursor: 'pointer', fontSize: '20px' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '16px 32px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0a0a0a' },
  tag: { fontSize: '9px', color: '#333', fontWeight: '900', letterSpacing: '1.5px' },
  pTitle: { fontSize: '18px', fontWeight: '700' },
  controls: { display: 'flex', gap: '12px' },
  select: { backgroundColor: '#111', color: '#fff', border: '1px solid #222', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' },
  btnRun: { backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  btnSub: { backgroundColor: '#007bff', border: 'none', color: '#fff', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  ideGrid: { flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr 320px', overflow: 'hidden' },
  briefing: { padding: '30px', backgroundColor: '#0a0a0a', borderRight: '1px solid #1a1a1a', overflowY: 'auto' },
  label: { fontSize: '10px', fontWeight: '900', color: '#222', letterSpacing: '1.5px', marginBottom: '15px' },
  desc: { fontSize: '14px', lineHeight: '1.7', color: '#888' },
  sampleBox: { backgroundColor: '#050505', padding: '15px', borderRadius: '10px', border: '1px solid #161616', marginBottom: '12px' },
  sampleText: { fontSize: '12px', color: '#aaa', fontFamily: 'monospace' },
  noSamples: { fontSize: '12px', color: '#333' },
  editorSec: { borderRight: '1px solid #1a1a1a' },
  terminal: { backgroundColor: '#0a0a0a', padding: '30px', display: 'flex', flexDirection: 'column' },
  stdin: { width: '100%', height: '100px', backgroundColor: '#050505', border: '1px solid #1a1a1a', borderRadius: '10px', color: '#fff', padding: '14px', fontSize: '13px', marginBottom: '24px', resize: 'none', outline: 'none' },
  stdout: { flex: 1, backgroundColor: '#000', padding: '16px', color: '#4ade80', fontSize: '12px', borderRadius: '10px', border: '1px solid #111', fontFamily: 'monospace', whiteSpace: 'pre-wrap' },
  verdict: { marginTop: '24px', padding: '20px', backgroundColor: '#111', borderRadius: '12px', borderLeft: '4px solid' },
  vTitle: { fontSize: '10px', color: '#444', fontWeight: '900' },
  vScore: { fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }
};

export default App;