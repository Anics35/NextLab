import React, { useState } from 'react';
import { login, register as registerApi } from '../services/authService';

const AuthForm = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = isLogin 
        ? await login(formData.email, formData.password)
        : await registerApi(formData);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isLogin ? 'Welcome Back' : 'Create NexLab Account'}</h2>
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <>
              <input 
                style={styles.input} type="text" placeholder="Full Name" required
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              {/* PROFESSIONAL ROLE SELECTION */}
              <div style={styles.roleGroup}>
                <label style={styles.label}>Register as:</label>
                <select 
                  style={styles.select} 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher (Admin)</option>
                </select>
              </div>
            </>
          )}
          
          <input 
            style={styles.input} type="email" placeholder="Email Address" required
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <input 
            style={styles.input} type="password" placeholder="Password" required
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
          
          <button type="submit" style={styles.button}>
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p style={styles.toggle} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212' },
  card: { padding: '40px', borderRadius: '12px', backgroundColor: '#1e1e1e', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: '400px', textAlign: 'center', color: '#fff' },
  title: { marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#2c2c2c', color: '#fff', fontSize: '16px' },
  roleGroup: { textAlign: 'left', marginBottom: '5px' },
  label: { fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block' },
  select: { width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#2c2c2c', color: '#fff', border: '1px solid #333', cursor: 'pointer' },
  button: { padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#007bff', color: '#fff', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
  error: { color: '#ff4d4d', backgroundColor: 'rgba(255, 77, 77, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' },
  toggle: { marginTop: '20px', color: '#007bff', cursor: 'pointer', fontSize: '14px' }
};

export default AuthForm;