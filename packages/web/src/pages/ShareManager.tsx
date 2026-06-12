import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Asset, formatDate } from '../api/client';

export default function ShareManager() {
  const [items, setItems] = useState<Asset[]>([]);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const load = async () => {
    try {
      // 通过 page=1 + 客户端过滤（后端暂无 share 过滤，简化）
      const r = await api.listAssets({ page: 1, limit: 100 });
      setItems(r.items.filter(a => !!a.share_token));
    } catch (e: any) { setErr(e?.message || '加载失败'); }
  };
  useEffect(() => { load(); }, []);

  const copy = (token: string) => {
    navigator.clipboard.writeText(`${location.origin}/api/share/${token}`);
    alert('已复制');
  };

  const unshare = async (a: Asset) => {
    await api.unshare(a.id);
    load();
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>CloudAsset</h1>
        <nav>
          <Link to="/">资产库</Link>
          <Link to="/upload">上传</Link>
          <Link to="/shares">分享</Link>
        </nav>
        <div className="spacer" />
        <button onClick={() => nav('/')}>返回</button>
      </div>
      <div className="content">
        {err && <div className="card" style={{ color: '#fca5a5' }}>{err}</div>}
        {items.length === 0 ? (
          <div className="empty"><span className="icon">🔗</span><p>暂无分享链接</p></div>
        ) : (
          <div className="asset-grid">
            {items.map(a => (
              <div key={a.id} className="card">
                <div className="asset-name" style={{ marginBottom: 6 }}>{a.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 8 }}>分享于 {formatDate(a.updated_at)}</div>
                <code style={{ display: 'block', fontSize: '0.78rem', wordBreak: 'break-all', background: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 6, marginBottom: 8 }}>
                  {location.origin}/api/share/{a.share_token}
                </code>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => copy(a.share_token!)} style={{ fontSize: '0.78rem' }}>复制</button>
                  <Link to={'/assets/' + a.id}><button style={{ fontSize: '0.78rem' }}>详情</button></Link>
                  <button className="danger" onClick={() => unshare(a)} style={{ fontSize: '0.78rem' }}>取消</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
