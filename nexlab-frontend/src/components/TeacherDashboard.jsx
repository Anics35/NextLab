import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Activity, Users, FileText, LogOut, AlertTriangle, 
  Search, ShieldAlert, CheckCircle2, Clock
} from 'lucide-react';

// Services & Components
import { logout } from '../services/authService';
import { socket, initSocket } from '../services/socket';
import ProblemCreator from './ProblemCreator';

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('monitor');
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [activeStudents, setActiveStudents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    initSocket(token);

    // 🔴 1. LISTEN FOR SEVERE PROCTORING ALERTS (Violations)
    const handleAlert = (data) => {
      const newAlert = {
        id: Date.now() + Math.random(),
        studentId: data.studentId,
        studentName: data.studentName || 'Active Student',
        type: data.type,
        time: data.time || new Date().toLocaleTimeString()
      };
      
      setLiveAlerts(prev => [newAlert, ...prev]);

      // Ensure student is marked with a violation
      setActiveStudents(prev => {
        const exists = prev.find(s => s.studentId === data.studentId);
        if (exists) {
          return prev.map(s => s.studentId === data.studentId ? { ...s, violations: s.violations + 1 } : s);
        }
        return [...prev, { studentId: data.studentId, name: newAlert.studentName, violations: 1 }];
      });

      toast.error(`ALERT: ${newAlert.studentName} - ${newAlert.type.replace('_', ' ').toUpperCase()}`, {
        style: { background: '#282828', color: '#ff5f56', border: '1px solid #ff5f56' },
        icon: '🚨'
      });
    };

    // 🟢 2. LISTEN FOR GENERAL UPDATES (Heartbeats, Runs, etc.) to populate the grid
    const handleStudentUpdate = (eventData) => {
      // eventData is the ActivityEvent from your backend
      const sId = eventData.studentId;
      const sName = eventData.meta?.studentName || "Candidate";

      setActiveStudents(prev => {
        const exists = prev.find(s => s.studentId === sId);
        if (!exists) {
          return [...prev, { studentId: sId, name: sName, violations: 0, lastActive: new Date() }];
        }
        // Update last active time
        return prev.map(s => s.studentId === sId ? { ...s, lastActive: new Date() } : s);
      });
    };

    socket?.on('proctor_alert', handleAlert);
    socket?.on('student_update', handleStudentUpdate);

    return () => {
      socket?.off('proctor_alert', handleAlert);
      socket?.off('student_update', handleStudentUpdate);
    };
  }, []);

  const handleLogout = () => {
    logout(); 
    // Auth service handles socket disconnect and reload
  };

  return (
    <div style={styles.appContainer}>
      <Toaster position="top-right" />
      
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logoSquare}>N</div>
        <div style={styles.sidebarActions}>
          <button 
            onClick={() => setActiveTab('monitor')} 
            style={{...styles.sideBtn, backgroundColor: activeTab === 'monitor' ? '#ffa116' : 'transparent', color: activeTab === 'monitor' ? '#000' : '#888'}}
            title="Live Monitor"
          >
            <Activity size={18} />
          </button>
          <button 
            onClick={() => setActiveTab('exams')} 
            style={{...styles.sideBtn, backgroundColor: activeTab === 'exams' ? '#ffa116' : 'transparent', color: activeTab === 'exams' ? '#000' : '#888'}}
            title="Exam Builder"
          >
            <FileText size={18} />
          </button>
          <button 
            onClick={() => setActiveTab('students')} 
            style={{...styles.sideBtn, backgroundColor: activeTab === 'students' ? '#ffa116' : 'transparent', color: activeTab === 'students' ? '#000' : '#888'}}
            title="Student Directory"
          >
            <Users size={18} />
          </button>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Logout"><LogOut size={18} /></button>
      </aside>

      <main style={styles.main}>
        {/* TOP NAVBAR */}
        <nav style={styles.navbar}>
          <div style={styles.navLeft}>
            <ShieldAlert size={18} color="#ffa116" />
            <span style={styles.pTitle}>Teacher Command Center</span>
          </div>
          <div style={styles.navRight}>
            <div style={styles.searchBox}>
               <Search size={14} color="#888" />
               <input type="text" placeholder="Search student..." style={styles.searchInput} />
            </div>
            <div style={styles.activeBadge}>
              <div style={styles.pulseDot}></div>
              Live Session Active
            </div>
          </div>
        </nav>

        {/* DYNAMIC CONTENT AREA */}
        <div style={styles.contentGrid}>
          
          {activeTab === 'monitor' ? (
            <>
              {/* LEFT: LIVE ALERTS FEED */}
              <div style={styles.panelContainer}>
                <div style={styles.panelHeader}>
                  <AlertTriangle size={14} color="#ff5f56" /> 
                  <span style={{color: '#ff5f56'}}>Real-Time Violations ({liveAlerts.length})</span>
                </div>
                <div style={styles.feedArea}>
                  {liveAlerts.length === 0 ? (
                    <div style={styles.emptyState}>No violations detected. The environment is secure.</div>
                  ) : (
                    liveAlerts.map(alert => (
                      <div key={alert.id} style={styles.alertCard}>
                        <div style={styles.alertHeader}>
                          <span style={styles.alertName}>{alert.studentName}</span>
                          <span style={styles.alertTime}>{alert.time}</span>
                        </div>
                        <div style={styles.alertType}>⚠️ {alert.type.replace('_', ' ').toUpperCase()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT: STUDENT GRID & STATS */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <div style={styles.statsRow}>
                   <div style={styles.statBox}>
                      <div style={styles.statLabel}>Active Candidates</div>
                      <div style={styles.statValue}>{activeStudents.length}</div>
                   </div>
                   <div style={styles.statBox}>
                      <div style={styles.statLabel}>Total Violations</div>
                      <div style={{...styles.statValue, color: '#ff5f56'}}>{liveAlerts.length}</div>
                   </div>
                </div>

                <div style={{...styles.panelContainer, flex: 1}}>
                  <div style={styles.panelHeader}>
                    <Users size={14} /> Connected Environment
                  </div>
                  <div style={styles.studentsGrid}>
                    {activeStudents.length === 0 ? (
                        <div style={styles.emptyState}>Awaiting student connections...</div>
                    ) : (
                      activeStudents.map(student => (
                        <div key={student.studentId} style={{...styles.studentCard, borderColor: student.violations > 0 ? '#ff5f5644' : '#333'}}>
                          <div style={styles.studentHeader}>
                             <span style={styles.studentName}>{student.name}</span>
                             {student.violations === 0 ? (
                               <CheckCircle2 size={16} color="#2cbb5d" />
                             ) : (
                               <div style={styles.violationPill}>{student.violations} Flags</div>
                             )}
                          </div>
                          <div style={styles.studentStatus}>
                            <Clock size={12} color="#888" /> 
                            <span style={{color: student.violations > 0 ? '#ff5f56' : '#888'}}>
                              {student.violations > 0 ? 'Review Required' : 'Coding active...'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'exams' ? (
            
            /* EXAM BUILDER TAB */
            <div style={{ gridColumn: '1 / -1', height: '100%', overflow: 'hidden' }}>
              <ProblemCreator />
            </div>

          ) : (
            
            /* STUDENTS TAB PLACEHOLDER */
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888', flexDirection: 'column', gap: '10px' }}>
               <Users size={40} color="#444" />
               <h2>Student Directory</h2>
               <p>Historical student data and grades will appear here.</p>
            </div>

          )}

        </div>
      </main>
    </div>
  );
}

const styles = {
  appContainer: { display: 'flex', height: '100vh', backgroundColor: '#1a1a1a', color: '#eff1f6', overflow: 'hidden', fontFamily: 'Inter, sans-serif' },
  sidebar: { width: '60px', backgroundColor: '#282828', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '15px' },
  logoSquare: { width: '32px', height: '32px', backgroundColor: '#ffa116', borderRadius: '6px', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' },
  sidebarActions: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' },
  sideBtn: { width: '40px', height: '40px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s' },
  logoutBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', marginTop: 'auto' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' },
  navbar: { height: '50px', backgroundColor: '#282828', borderRadius: '8px', marginBottom: '8px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  pTitle: { fontSize: '14px', fontWeight: '700', letterSpacing: '0.5px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e1e1e', padding: '6px 12px', borderRadius: '6px', border: '1px solid #333' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', width: '150px' },
  activeBadge: { fontSize: '11px', fontWeight: '600', color: '#2cbb5d', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2cbb5d15', padding: '4px 10px', borderRadius: '20px', border: '1px solid #2cbb5d33' },
  pulseDot: { width: '6px', height: '6px', backgroundColor: '#2cbb5d', borderRadius: '50%', boxShadow: '0 0 8px #2cbb5d' },
  contentGrid: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', height: '100%', overflow: 'hidden' },
  panelContainer: { backgroundColor: '#282828', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #333' },
  panelHeader: { height: '40px', backgroundColor: '#33333366', display: 'flex', alignItems: 'center', padding: '0 15px', fontSize: '11px', fontWeight: '800', gap: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #333' },
  feedArea: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  emptyState: { textAlign: 'center', color: '#555', fontSize: '12px', marginTop: '40px', fontStyle: 'italic' },
  alertCard: { backgroundColor: '#1e1e1e', borderLeft: '4px solid #ff5f56', padding: '12px', borderRadius: '6px', borderTop: '1px solid #333', borderRight: '1px solid #333', borderBottom: '1px solid #333' },
  alertHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  alertName: { fontSize: '13px', fontWeight: 'bold', color: '#eff1f6' },
  alertTime: { fontSize: '10px', color: '#888' },
  alertType: { fontSize: '11px', color: '#ff5f56', fontWeight: '600', fontFamily: 'monospace' },
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  statBox: { backgroundColor: '#282828', borderRadius: '8px', padding: '20px', border: '1px solid #333', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  statLabel: { fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '5px' },
  statValue: { fontSize: '28px', fontWeight: '900', color: '#eff1f6' },
  studentsGrid: { padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', overflowY: 'auto', alignContent: 'start' },
  studentCard: { backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #333', transition: 'border-color 0.3s' },
  studentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  studentName: { fontSize: '13px', fontWeight: 'bold' },
  violationPill: { fontSize: '9px', fontWeight: 'bold', backgroundColor: '#ff5f5622', color: '#ff5f56', padding: '2px 6px', borderRadius: '10px', border: '1px solid #ff5f5644' },
  studentStatus: { fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }
};

export default TeacherDashboard;