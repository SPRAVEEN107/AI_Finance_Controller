import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Bot,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Send,
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  User,
  Lock,
  Mail,
  LogOut,
  KeyRound,
  X,
  Cpu,
  ShieldAlert
} from 'lucide-react';

const API_BASE = 'http://localhost:7070/api';

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('user_info') || 'null')
  );

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Dashboard Data State
  const [records, setRecords] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // AI Drawer State
  const [aiOpen, setAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: '👋 Hello! I am your **AI Finance Intelligence Assistant**. I monitor multi-source reconciliation data, explain exceptions, and summarize financial batch metrics. How can I help you today?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Fetch data on load if authenticated or available
  useEffect(() => {
    fetchRecords();
    fetchEvaluation();
  }, [token]);

  const getAuthHeaders = () => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setCurrentUser({ name: data.name, email: data.email, role: data.role });
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('user_info', JSON.stringify({ name: data.name, email: data.email, role: data.role }));
        setAuthForm({ name: '', email: '', password: '' });
      } else {
        setAuthError(data.error || 'Invalid login credentials.');
      }
    } catch (err) {
      setAuthError('Network error connecting to auth server.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess(`Registration successful as ${data.role}! Please log in.`);
        setAuthMode('login');
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setAuthError('Network error connecting to auth server.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_info');
  };

  const fetchRecords = async (status = '') => {
    try {
      const url = status && status !== 'ALL'
        ? `${API_BASE}/reconciliation/records?status=${status}`
        : `${API_BASE}/reconciliation/records`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const res = await fetch(`${API_BASE}/reconciliation/evaluation`, { headers: getAuthHeaders() });
      if (res.ok && res.status !== 204) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error('Failed to fetch evaluation:', err);
    }
  };

  const handleRunReconciliation = async () => {
    if (!isAdmin) {
      alert('🔒 Permission Denied: Only Admin (Praveen) can execute reconciliation runs.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reconciliation/run`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchRecords(activeTab);
        await fetchEvaluation();
      }
    } catch (err) {
      console.error('Failed to run reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateData = async () => {
    if (!isAdmin) {
      alert('🔒 Permission Denied: Only Admin (Praveen) can generate benchmark datasets.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/data/generate?count=100`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await handleRunReconciliation();
      }
    } catch (err) {
      console.error('Failed to generate dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async (promptQuery = null) => {
    const queryToSend = promptQuery || chatInput;
    if (!queryToSend.trim()) return;

    const newMessages = [...chatMessages, { sender: 'user', text: queryToSend }];
    setChatMessages(newMessages);
    if (!promptQuery) setChatInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ query: queryToSend })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages([...newMessages, { sender: 'ai', text: data.response }]);
      } else {
        setChatMessages([...newMessages, { sender: 'ai', text: '⚠️ Unable to connect to AI engine server.' }]);
      }
    } catch (err) {
      setChatMessages([...newMessages, { sender: 'ai', text: '⚠️ Network error connecting to Spring Boot backend.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab;
    const matchesSearch = searchTerm === '' ||
      r.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.exceptionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.explanation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCHED':
        return <span className="badge badge-matched"><CheckCircle2 size={12} /> Matched</span>;
      case 'REVIEW':
        return <span className="badge badge-review"><AlertTriangle size={12} /> Needs Review</span>;
      case 'EXCEPTION':
        return <span className="badge badge-exception"><XCircle size={12} /> Exception</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // If not logged in, render Authentication Portal
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-card" style={{ width: '420px', maxWidth: '100%', padding: '36px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7, #7c3aed)', width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={28} color="#ffffff" />
            </div>
            <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px' }}>
              AI Finance Controller
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {authMode === 'login' ? 'JWT Signed User Authentication' : 'Register New User Account'}
            </p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {authSuccess}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            {authMode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name (e.g. Praveen)"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="user@finance.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              {authMode === 'login' ? 'Sign In & Authenticate JWT' : 'Register Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {authMode === 'login' ? (
              <span>Don't have an account? <a href="#register" onClick={(e) => { e.preventDefault(); setAuthMode('register'); }} style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>Register here</a></span>
            ) : (
              <span>Already registered? <a href="#login" onClick={(e) => { e.preventDefault(); setAuthMode('login'); }} style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>Sign In</a></span>
            )}
          </div>

        </div>
      </div>
    );
  }

  // Render Main Dashboard when Authenticated
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* HEADER NAVBAR */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7, #7c3aed)', padding: '12px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                AI Finance Controller
              </h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                <span className="pulse-dot"></span> {isAdmin ? 'ADMIN CONTROL' : 'USER ANALYST'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
              Automated multi-source financial reconciliation & LLM explanation platform
            </p>
          </div>
        </div>

        {/* Action Controls & User Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <User size={16} color={isAdmin ? '#c084fc' : 'var(--accent-cyan)'} />
            <span style={{ fontWeight: 600 }}>{currentUser?.name || currentUser?.email}</span>
            <span style={{ background: isAdmin ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.15)', color: isAdmin ? '#c084fc' : '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
              {currentUser?.role}
            </span>
          </div>

          {/* ADMIN ONLY CONTROLS */}
          {isAdmin ? (
            <>
              <button onClick={handleGenerateData} disabled={loading} className="btn-secondary">
                <Database size={16} />
                Generate Dataset
              </button>
              <button onClick={handleRunReconciliation} disabled={loading} className="btn-primary">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Run Reconciliation
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600 }}>
              <ShieldAlert size={14} /> Read-Only Mode (User)
            </div>
          )}

          <button onClick={() => setAiOpen(true)} className="btn-ai">
            <Bot size={18} />
            AI Assistant
          </button>

          <button onClick={handleLogout} className="btn-secondary" title="Logout" style={{ padding: '10px 14px' }}>
            <LogOut size={16} color="#fb7185" />
          </button>
        </div>
      </header>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Total Processed */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Records</span>
            <Layers size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{records.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Multi-source batch feed</div>
        </div>

        {/* Match Rate */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Match Rate</span>
            <ShieldCheck size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399' }}>
            {evaluation ? `${evaluation.matchRate}%` : '0.0%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {evaluation ? `${evaluation.matchedCount} matched / ${evaluation.totalRecords} total` : 'Awaiting execution'}
          </div>
        </div>

        {/* Precision */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Engine Precision</span>
            <BarChart3 size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#c084fc' }}>
            {evaluation ? `${evaluation.precisionMetric}%` : '100%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Ground truth benchmark</div>
        </div>

        {/* F1 Score */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>F1 Accuracy Score</span>
            <Sparkles size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa' }}>
            {evaluation ? `${evaluation.f1Score}%` : '100%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Harmonic mean precision/recall</div>
        </div>

        {/* Throughput */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Throughput</span>
            <Zap size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24' }}>
            {evaluation ? `${evaluation.throughput}` : '0'} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>rec/s</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {evaluation ? `Execution time: ${evaluation.processingTimeMs} ms` : 'Latency tracking'}
          </div>
        </div>

      </div>

      {/* MAIN CONTENT SECTION */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        
        {/* Table Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            {['ALL', 'MATCHED', 'REVIEW', 'EXCEPTION'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); fetchRecords(tab); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {tab === 'ALL' && `All Records (${records.length})`}
                {tab === 'MATCHED' && `✅ Matched (${records.filter(r => r.status === 'MATCHED').length})`}
                {tab === 'REVIEW' && `⚠️ Review (${records.filter(r => r.status === 'REVIEW').length})`}
                {tab === 'EXCEPTION' && `❌ Exceptions (${records.filter(r => r.status === 'EXCEPTION').length})`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search Transaction ID, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                <th style={{ padding: '12px 16px' }}>Payment Ref</th>
                <th style={{ padding: '12px 16px' }}>Match Score</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Audit Breakdown</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No financial records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr 
                    key={rec.id} 
                    style={{ borderBottom: '1px solid rgba(42, 54, 79, 0.4)', transition: 'background 0.15s ease' }}
                    className="hover:bg-slate-800/40"
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600 }} className="font-mono">
                      {rec.transactionId}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }} className="font-mono">
                      {rec.paymentId || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${rec.matchScore}%`, 
                              background: rec.matchScore >= 90 ? '#10b981' : rec.matchScore >= 70 ? '#f59e0b' : '#f43f5e',
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }} className="font-mono">
                          {rec.matchScore?.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(rec.status)}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {rec.exceptionType}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.explanation}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => { setAiOpen(true); handleSendChat(`Why is ${rec.transactionId} flagged as ${rec.status}?`); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Ask AI <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* AI ASSISTANT DRAWER */}
      {aiOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '100vw', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', boxShadow: '-10px 0 40px rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          
          {/* Drawer Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={22} color="var(--accent-purple)" />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>AI Finance Intelligence</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Verified MySQL Database Context</span>
              </div>
            </div>
            <button onClick={() => setAiOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Prompt Chips */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', overflowX: 'auto', background: 'var(--bg-primary)' }}>
            <button onClick={() => handleSendChat('Summarize today\'s reconciliation results')} style={{ padding: '6px 12px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📊 Batch Summary
            </button>
            <button onClick={() => handleSendChat('What are the main exception types?')} style={{ padding: '6px 12px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ⚠️ Exception Types
            </button>
            <button onClick={() => handleSendChat('Show system accuracy and throughput metrics')} style={{ padding: '6px 12px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              🎯 Benchmarks
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                style={{ 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'var(--bg-card)',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.875rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.text}
              </div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} className="animate-spin" color="var(--accent-purple)" />
                AI is querying database context...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ask a finance or exception question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button type="submit" disabled={aiLoading} className="btn-ai" style={{ padding: '10px 16px' }}>
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
