import React, { useState, useEffect } from 'react';
import { getActivityLogs, getAllSubmissions, getProblems } from '../services/codeService';
import ProblemCreator from './ProblemCreator';
import { logout } from '../services/authService';

const TeacherDashboard = () => {
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    syncDashboard();
    const interval = setInterval(syncDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const syncDashboard = async () => {
    try {
      const [act, sub, prob] = await Promise.all([
        getActivityLogs().catch(() => []), // Fallback to empty array if call fails
        getAllSubmissions().catch(() => []), 
        getProblems().catch(() => [])
      ]);
      setActivities(Array.isArray(act) ? act : []);
      setSubmissions(Array.isArray(sub) ? sub : []);
      setProblems(Array.isArray(prob) ? prob : []);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/'; // Forces a clean redirect
  };

  if (loading) return <div style={styles.loader}>SECURE BOOT INITIALIZED...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brandSec}>
          <div style={styles.logo}>N</div>
          <div>
            <h1 style={styles.mainTitle}>NexLab Admin</h1>
            <div style={styles.status}>● SYSTEM ONLINE</div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => setShowCreator(!showCreator)} 
            style={{...styles.actionBtn, backgroundColor: showCreator ? '#ff4d4d' : '#007bff'}}
          >
            {showCreator ? 'CLOSE ARCHITECT' : 'CREATE CHALLENGE'}
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn}>SIGN OUT</button>
        </div>
      </header>

      <div style={styles.dashboardGrid}>
        <aside style={styles.leftCol}>
          {showCreator && (
            <div style={styles.creatorWrapper}>
              <ProblemCreator onProblemAdded={() => { setShowCreator(false); syncDashboard(); }} />
            </div>
          )}

          <div style={styles.sectionLabel}>CHALLENGE REPOSITORY</div>
          <div style={styles.repoList}>
            {(problems || []).map(p => (
              <div key={p?._id} style={styles.repoCard}>
                <div style={styles.repoHead}>
                  <strong>{p?.title || "Untitled"}</strong>
                  <span style={styles.diffBadge}>{p?.difficulty?.toUpperCase() || "EASY"}</span>
                </div>
                <div style={styles.repoStats}>
                  {p?.testCases?.length || 0} Cases • {p?.testCases?.filter(t => !t.isPublic).length || 0} Hidden
                </div>
              </div>
            ))}
          </div>

          <div style={styles.sectionLabel} style={{marginTop: '40px'}}>LIVE TELEMETRY</div>
          <div style={styles.activityFeed}>
            {(activities || []).map((ev, i) => (
              <div key={i} style={styles.activityItem}>
                <div style={styles.activityInfo}>
                  <strong>{ev?.meta?.studentName || 'Student'}</strong>: {ev?.message}
                </div>
                <div style={styles.activityTime}>{ev?.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : '--:--'}</div>
              </div>
            ))}
          </div>
        </aside>

        <main style={styles.rightCol}>
          <div style={styles.sectionLabel}>SUBMISSION ANALYTICS</div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>STUDENT</th>
                  <th style={styles.th}>CHALLENGE</th>
                  <th style={styles.th}>VERDICT</th>
                  <th style={styles.th}>LANG</th>
                  <th style={styles.th}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {(submissions || []).map((s, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{s?.studentId?.name || 'Unknown'}</td>
                    <td style={styles.td}>{s?.problemId?.title || 'Challenge'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.score, 
                        color: s?.passed === s?.total ? '#4ade80' : '#f87171',
                        backgroundColor: s?.passed === s?.total ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)'
                      }}>
                        {s?.passed || 0} / {s?.total || 0} PASSED
                      </span>
                    </td>
                    <td style={styles.td}><code style={styles.langTag}>{s?.language}</code></td>
                    <td style={styles.td}>{s?.createdAt ? new Date(s.createdAt).toLocaleDateString() : '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

// ... keep exactly the same styles object from before ...
const styles = {
  container: { backgroundColor: '#050505', minHeight: '100vh', color: '#fff', padding: '40px', fontFamily: '"Inter", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' },
  brandSec: { display: 'flex', alignItems: 'center', gap: '15px' },
  logo: { width: '40px', height: '40px', backgroundColor: '#007bff', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '20px' },
  mainTitle: { fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' },
  status: { fontSize: '10px', color: '#4ade80', fontWeight: 'bold', marginTop: '4px', letterSpacing: '1px' },
  headerActions: { display: 'flex', gap: '15px' },
  actionBtn: { padding: '12px 24px', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  logoutBtn: { padding: '12px 24px', backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#555', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '400px 1fr', gap: '40px' },
  sectionLabel: { fontSize: '11px', fontWeight: '900', color: '#333', letterSpacing: '2px', marginBottom: '20px' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '10px' },
  creatorWrapper: { marginBottom: '30px' },
  repoList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  repoCard: { backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '16px', border: '1px solid #1a1a1a' },
  repoHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  diffBadge: { fontSize: '9px', fontWeight: '900', color: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' },
  repoStats: { fontSize: '12px', color: '#444' },
  activityFeed: { height: '350px', overflowY: 'auto', backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '16px', border: '1px solid #1a1a1a' },
  activityItem: { display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid #111' },
  activityInfo: { fontSize: '13px', color: '#bbb' },
  activityTime: { fontSize: '10px', color: '#333' },
  rightCol: { backgroundColor: '#0a0a0a', borderRadius: '24px', padding: '40px', border: '1px solid #1a1a1a', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '15px', fontSize: '11px', color: '#333', borderBottom: '1px solid #1a1a1a' },
  tr: { borderBottom: '1px solid #111', transition: '0.2s' },
  td: { padding: '20px 15px', fontSize: '14px', color: '#eee' },
  score: { padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
  langTag: { fontFamily: 'monospace', fontSize: '12px', color: '#007bff' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505', color: '#333', letterSpacing: '4px', fontSize: '12px' }
};

export default TeacherDashboard;