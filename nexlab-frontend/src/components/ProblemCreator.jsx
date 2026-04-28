import React, { useState } from 'react';
import { createProblem } from '../services/codeService';

const ProblemCreator = ({ onProblemAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    testCases: [{ input: '', expectedOutput: '', isPublic: true }]
  });

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: '', expectedOutput: '', isPublic: false }]
    });
  };

  const removeTestCase = (index) => {
    const filtered = formData.testCases.filter((_, i) => i !== index);
    setFormData({ ...formData, testCases: filtered });
  };

  const handleTestChange = (index, field, value) => {
    const newTests = [...formData.testCases];
    newTests[index][field] = value;
    setFormData({ ...formData, testCases: newTests });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProblem(formData);
      alert("Nexus Database Updated: Challenge Deployed.");
      onProblemAdded();
      setFormData({ 
        title: '', 
        description: '', 
        difficulty: 'easy', 
        testCases: [{ input: '', expectedOutput: '', isPublic: true }] 
      });
    } catch (err) { 
      alert("Sync Failed: " + (err.response?.data?.error || "Check Schema configuration.")); 
    }
  };

  return (
    <div style={styles.card}>
      <header style={styles.cardHeader}>
        <div style={styles.headerDot}></div>
        <h3 style={styles.title}>Challenge Architect</h3>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>PROBLEM TITLE</label>
          <input style={styles.input} placeholder="e.g. Reverse an Array" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>DESCRIPTION</label>
          <textarea style={styles.textarea} placeholder="Describe the logic and constraints..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>DIFFICULTY</label>
          <select style={styles.select} value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div style={styles.testHeader}>
          <label style={styles.label}>TEST ENGINE CONFIG</label>
          <button type="button" onClick={addTestCase} style={styles.btnSmall}>+ Add Case</button>
        </div>

        <div style={styles.testList}>
          {formData.testCases.map((tc, i) => (
            <div key={i} style={styles.testRow}>
              <div style={styles.testMeta}>
                <span style={styles.testIndex}>#{i + 1}</span>
                <input 
                  type="checkbox" 
                  checked={tc.isPublic} 
                  onChange={e => handleTestChange(i, 'isPublic', e.target.checked)} 
                />
                <span style={{ fontSize: '9px', color: tc.isPublic ? '#007bff' : '#444' }}>{tc.isPublic ? 'PUB' : 'HID'}</span>
              </div>
              <div style={styles.testInputs}>
                <input style={styles.minInput} placeholder="Input" value={tc.input} onChange={e => handleTestChange(i, 'input', e.target.value)} />
                <input style={styles.minInput} placeholder="Output" value={tc.expectedOutput} onChange={e => handleTestChange(i, 'expectedOutput', e.target.value)} required />
              </div>
              {formData.testCases.length > 1 && (
                <button type="button" onClick={() => removeTestCase(i)} style={styles.btnDel}>×</button>
              )}
            </div>
          ))}
        </div>
        <button type="submit" style={styles.btnSubmit}>Deploy to NexLab</button>
      </form>
    </div>
  );
};

const styles = {
  card: { backgroundColor: '#0f0f0f', padding: '24px', borderRadius: '16px', border: '1px solid #222' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  headerDot: { width: '8px', height: '8px', backgroundColor: '#007bff', borderRadius: '50%', boxShadow: '0 0 10px #007bff' },
  title: { fontSize: '12px', fontWeight: '800', color: '#fff', letterSpacing: '1px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '9px', fontWeight: '900', color: '#444', letterSpacing: '1px' },
  input: { padding: '12px', backgroundColor: '#161616', border: '1px solid #222', color: '#fff', borderRadius: '8px', outline: 'none' },
  textarea: { padding: '12px', backgroundColor: '#161616', border: '1px solid #222', color: '#fff', borderRadius: '8px', height: '80px', outline: 'none', resize: 'none' },
  select: { padding: '10px', backgroundColor: '#161616', color: '#fff', border: '1px solid #222', borderRadius: '8px' },
  testHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  btnSmall: { padding: '4px 10px', backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#007bff', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' },
  testList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  testRow: { display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#161616', padding: '10px', borderRadius: '10px', border: '1px solid #222' },
  testMeta: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' },
  testIndex: { fontSize: '10px', color: '#333', fontWeight: 'bold' },
  testInputs: { flex: 1, display: 'flex', gap: '8px' },
  minInput: { flex: 1, padding: '8px', backgroundColor: '#000', color: '#4ade80', border: '1px solid #111', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' },
  btnDel: { background: 'none', border: 'none', color: '#444', fontSize: '18px', cursor: 'pointer' },
  btnSubmit: { padding: '14px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};

export default ProblemCreator;