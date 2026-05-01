import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { toast, Toaster } from 'react-hot-toast';
import { AlertTriangle, Clock, Play, Send, Layout } from 'lucide-react';
import socket from '../services/socket'; // Ensure your socket service is imported

const SecureIDE = ({ problem, examSettings }) => {
  const [code, setCode] = useState(problem?.starterCode || "");
  const [output, setOutput] = useState("");
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour default
  const [isRunning, setIsRunning] = useState(false);

  // 1. PROCTORING: Block Copy, Paste, and Right-Click
  const handleSecurityInvasion = (e) => {
    e.preventDefault();
    toast.error("Security Alert: Action Blocked!", {
      style: { background: '#1e1e1e', color: '#ff4b4b', border: '1px solid #ff4b4b' }
    });
    socket.emit('proctor_event', { type: e.type, timestamp: new Date() }); //
  };

  // 2. PROCTORING: Tab Switching Detection[cite: 2]
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        socket.emit('tab_switch', { time: new Date() }); //[cite: 2]
        toast('Violation Logged: Tab Switch Detected', { icon: '⚠️' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 3. AUTO-SAVE LOGIC[cite: 2]
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (code) {
        socket.emit('auto_save_code', { code }); //[cite: 2]
        console.log("Code auto-saved to cloud...");
      }
    }, 5000); // Save every 5 seconds

    return () => clearTimeout(delayDebounceFn);
  }, [code]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-indigo-500/30">
      <Toaster position="top-center" />
      
      {/* PREMIUM HEADER */}
      <header className="h-16 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">N</div>
          <h1 className="text-lg font-semibold tracking-tight">NexLab <span className="text-white/40 font-normal">| {problem?.title || "Final Exam"}</span></h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-orange-400">
            <Clock size={16} />
            <span className="font-mono font-bold tracking-wider">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-all text-sm font-medium">
            Finish Exam
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* LEFT PANEL: PROBLEM BRIEF[cite: 2] */}
        <section className="w-1/3 border-r border-white/10 p-6 overflow-y-auto bg-[#080808]">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Layout size={18} />
            <span className="text-xs uppercase font-bold tracking-widest">Problem Statement</span>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">{problem?.title}</h2>
          <div className="prose prose-invert prose-sm opacity-80 leading-relaxed">
             {problem?.description}
          </div>
          
          <div className="mt-8">
            <h3 className="text-xs uppercase font-bold text-white/40 mb-3 tracking-widest">Test Cases</h3>
            <div className="space-y-2">
              {problem?.testCases?.filter(tc => tc.isPublic).map((tc, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 font-mono text-xs">
                  <div className="text-indigo-400 mb-1">Input: {tc.input}</div>
                  <div className="text-green-400">Expected: {tc.expectedOutput}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CENTER PANEL: MONACO EDITOR[cite: 2] */}
        <section 
          className="flex-1 flex flex-col relative"
          onCopy={handleSecurityInvasion}
          onPaste={handleSecurityInvasion}
          onContextMenu={handleSecurityInvasion}
        >
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="cpp"
              value={code}
              onChange={(val) => setCode(val)}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 20 },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                backgroundColor: "#050505"
              }}
            />
          </div>

          {/* CONSOLE / OUTPUT AREA[cite: 2] */}
          <div className="h-1/3 border-t border-white/10 bg-[#0a0a0a] p-4 font-mono text-sm overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white/40 tracking-widest uppercase">Output Console</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsRunning(true)}
                  className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs transition-all"
                >
                  <Play size={12} className="fill-current" /> Run Sample
                </button>
                <button className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-all font-bold">
                  <Send size={12} /> Submit Exam
                </button>
              </div>
            </div>
            <pre className={`mt-2 ${output.includes('Error') ? 'text-red-400' : 'text-gray-400'}`}>
              {output || "> Ready for execution..."}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SecureIDE;