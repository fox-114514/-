import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setKey, setBase } from '../api/client';

export default function Login() {
  const [key, setKeyInput] = useState('');
  const [base, setBaseInput] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const baseUrl = base.trim() || window.location.origin;
      setBase(baseUrl);
      setKey(key.trim());
      const res = await fetch(baseUrl + '/api/health');
      if (!res.ok) throw new Error('Server unreachable');
      nav('/');
    } catch (e: any) {
      setErr(e?.message || '登录失败');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h2>CloudAsset</h2>
        <p className="hint">输入 API Key 连接你的资产库。首次使用请在服务器 <code>.env</code> 中配置 <code>API_KEY</code>。</p>
        <div className="form-row">
          <label>服务器地址 (可选)</label>
          <input value={base} onChange={e => setBaseInput(e.target.value)} placeholder="http://localhost:3000 · 留空使用当前站点" />
        </div>
        <div className="form-row">
          <label>API Key</label>
          <input value={key} onChange={e => setKeyInput(e.target.value)} type="password" placeholder="X-API-Key" required />
        </div>
        {err && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 12 }}>{err}</div>}
        <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? '连接中…' : '连接'}
        </button>
      </form>
    </div>
  );
}
