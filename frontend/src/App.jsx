import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Send,
  RefreshCw,
  Database,
  User,
  Lock,
  Mail,
  LogOut,
  KeyRound,
  X,
  Bot,
  Layers,
  BarChart2,
  ShieldCheck,
  Zap,
  ArrowRight
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

  // Assistant Drawer State
  const [aiOpen, setAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello. I can assist with reconciliation analysis, explain specific flagged exceptions, or summarize the current batch statistics. How can I help?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Fetch data on load if authenticated
  useEffect(() => {
    if (token) {
      fetchRecords();
      fetchEvaluation();
    }
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
        setAuthError(data.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err) {
      setAuthError('Unable to connect to authentication service.');
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
        setAuthSuccess(`Account created for ${data.email} (${data.role}). You may now sign in.`);
        setAuthMode('login');
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setAuthError('Unable to reach server for registration.');
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
      alert('Action Restricted: Only administrator accounts can execute reconciliation runs.');
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
      alert('Action Restricted: Only administrator accounts can generate benchmark data.');
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
        setChatMessages([...newMessages, { sender: 'ai', text: 'Error: Failed to obtain response from assistant service.' }]);
      }
    } catch (err) {
      setChatMessages([...newMessages, { sender: 'ai', text: 'Network Error: Cannot connect to assistant service.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab;
    const matchesSearch =
      searchTerm === '' ||
      r.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.exceptionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.explanation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span className="badge badge-matched">
            <CheckCircle2 size={13} /> Matched
          </span>
        );
      case 'REVIEW':
        return (
          <span className="badge badge-review">
            <AlertTriangle size={13} /> Needs Review
          </span>
        );
      case 'EXCEPTION':
        return (
          <span className="badge badge-exception">
            <XCircle size={13} /> Exception
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Login / Register Portal
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px' }}>
        <div className="card" style={{ width: '380px', maxWidth: '100%', padding: '32px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Lock size={18} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              Finance Controller
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              {authMode === 'login' ? 'Sign in to access reconciliation workspace' : 'Create an analyst account'}
            </p>
          </div>

          {authError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '16px' }}>
              {authSuccess}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {authMode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Praveen"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@company.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>
                Password
              </label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}>
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
            {authMode === 'login' ? (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                >
                  Register
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(''); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 500, cursor: 'pointer', padding: 0 }}
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

        </div>
      </div>
    );
  }

  // Authenticated Main View
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#0f172a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>FC</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Finance Controller
            </span>
          </div>

          <span style={{ height: '18px', width: '1px', backgroundColor: '#e2e8f0' }} />

          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-indicator"></span> System Operational
          </span>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin ? (
            <>
              <button onClick={handleGenerateData} disabled={loading} className="btn-secondary" title="Populate synthetic transaction & payment dataset">
                <Database size={15} />
                Generate Sample Data
              </button>
              <button onClick={handleRunReconciliation} disabled={loading} className="btn-primary" title="Execute multi-source matching engine">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Run Reconciliation
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
              Read-Only Analyst View
            </span>
          )}

          <button onClick={() => setAiOpen(true)} className="btn-assistant">
            <Bot size={15} />
            Reconciliation Assistant
          </button>

          <span style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', padding: '4px 8px' }}>
            <User size={15} color="#64748b" />
            <span style={{ fontWeight: 500 }}>{currentUser?.name || currentUser?.email}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              {currentUser?.role}
            </span>
          </div>

          <button onClick={handleLogout} className="btn-secondary" title="Sign out" style={{ padding: '8px 10px' }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{ padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', flex: 1 }}>
        
        {/* KPI Metric Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
              <span>Total Transactions</span>
              <Layers size={16} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>
              {records.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Loaded from database
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
              <span>Match Rate</span>
              <ShieldCheck size={16} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: evaluation?.matchRate >= 80 ? '#059669' : '#0f172a' }}>
              {evaluation ? `${evaluation.matchRate}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              {evaluation ? `${evaluation.matchedCount} of ${evaluation.totalRecords} matched` : 'Pending execution'}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
              <span>Precision</span>
              <BarChart2 size={16} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>
              {evaluation ? `${evaluation.precisionMetric}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Against ground truth
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
              <span>F1 Score</span>
              <BarChart2 size={16} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>
              {evaluation ? `${evaluation.f1Score}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Harmonic accuracy metric
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginBottom: '8px' }}>
              <span>Throughput</span>
              <Zap size={16} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>
              {evaluation ? `${evaluation.throughput}` : '0'}{' '}
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>rec/s</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              {evaluation ? `Duration: ${evaluation.processingTimeMs} ms` : 'Batch latency'}
            </div>
          </div>

        </div>

        {/* Data Table Section */}
        <div className="card" style={{ overflow: 'hidden' }}>
          
          {/* Controls Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Filter Tabs */}
            <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '6px', gap: '2px' }}>
              {[
                { id: 'ALL', label: `All (${records.length})` },
                { id: 'MATCHED', label: `Matched (${records.filter(r => r.status === 'MATCHED').length})` },
                { id: 'REVIEW', label: `Review (${records.filter(r => r.status === 'REVIEW').length})` },
                { id: 'EXCEPTION', label: `Exceptions (${records.filter(r => r.status === 'EXCEPTION').length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); fetchRecords(tab.id); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search transaction, ref, or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
              />
            </div>

          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                  <th style={{ padding: '10px 16px' }}>Transaction ID</th>
                  <th style={{ padding: '10px 16px' }}>Payment Ref</th>
                  <th style={{ padding: '10px 16px' }}>Match Score</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Category</th>
                  <th style={{ padding: '10px 16px' }}>Audit Note</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }} className="font-mono">
                        {rec.transactionId}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }} className="font-mono">
                        {rec.paymentId || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${rec.matchScore}%`,
                                backgroundColor: rec.matchScore >= 90 ? '#10b981' : rec.matchScore >= 70 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }} className="font-mono">
                            {rec.matchScore?.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(rec.status)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.8rem' }}>
                        {rec.exceptionType}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rec.explanation}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setAiOpen(true);
                            handleSendChat(`Provide audit details and reasoning for transaction ${rec.transactionId} (${rec.status})`);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          Analyze <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* Assistant Side Drawer */}
      {aiOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '100vw', backgroundColor: '#ffffff', borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          
          {/* Drawer Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="#2563eb" />
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  Reconciliation Assistant
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Contextual analysis & queries
                </span>
              </div>
            </div>
            <button
              onClick={() => setAiOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Query Suggestions */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto', backgroundColor: '#f8fafc' }}>
            <button
              onClick={() => handleSendChat('Summarize reconciliation batch results')}
              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Batch Summary
            </button>
            <button
              onClick={() => handleSendChat('List the main exception types and counts')}
              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Exception Breakdown
            </button>
            <button
              onClick={() => handleSendChat('What are the system precision and throughput metrics?')}
              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Metrics
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: msg.sender === 'user' ? '#0f172a' : '#f8fafc',
                  color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.text}
              </div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={13} className="animate-spin" /> Fetching analysis...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask about a transaction or metric..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={aiLoading} className="btn-primary" style={{ padding: '8px 12px' }}>
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
