import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api, type Asset, clearKey, formatDate, formatSize } from '../api/client';

const CATEGORIES = ['image', 'video', 'audio', 'document', 'code', 'data', 'other'];

function Thumb({ a }: { a: Asset }) {
  if (a.mime_type.startsWith('image/')) {
    return <div className="asset-thumb"><img src={api.contentUrl(a.id)} alt={a.name} loading="lazy" /></div>;
  }
  const icon = a.category === 'video' ? '🎬' : a.category === 'audio' ? '🎵' : a.category === 'code' ? '💻' : a.category === 'document' ? '📄' : a.category === 'data' ? '📊' : '📁';
  return <div className="asset-thumb">{icon}</div>;
}

export default function AssetList() {
  const [items, setItems] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const load = async () => {
    try {
      const resp = await api.listAssets({ q, category, tag, page, limit: 50 });
      setItems(resp.items); setTotal(resp.total);
    } catch (e: any) { setErr(e?.message || '加载失败'); }
  };

  useEffect(() => { load(); }, [q, category, tag, page]);

  const onDelete = async (a: Asset) => {
    if (!confirm(`删除 "${a.name}"?`)) return;
    await api.deleteAsset(a.id);
    load();
  };

  const logout = () => { clearKey(); nav('/login'); };

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>CloudAsset</h1>
        <nav>
          <NavLink to="/" end>资产库</NavLink>
          <NavLink to="/upload">上传</NavLink>
          <NavLink to="/shares">分享</NavLink>
        </nav>
        <div className="spacer" />
        <button onClick={logout}>登出</button>
      </div>
      <div className="content">
        <div className="toolbar">
          <input className="grow" placeholder="搜索名称/描述…" value={q} onChange={e => { setPage(1); setQ(e.target.value); }} />
          <select value={category} onChange={e => { setPage(1); setCategory(e.target.value); }} style={{ maxWidth: 140 }}>
            <option value="">全部分类</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="标签" value={tag} onChange={e => { setPage(1); setTag(e.target.value); }} style={{ maxWidth: 140 }} />
          <Link to="/upload"><button className="primary">＋ 上传</button></Link>
        </div>

        {err && <div className="card" style={{ borderColor: '#fca5a5', color: '#fca5a5' }}>{err}</div>}

        {items.length === 0 ? (
          <div className="empty">
            <span className="icon">📦</span>
            <p>暂无资产 · <Link to="/upload">上传一个</Link></p>
          </div>
        ) : (
          <div className="asset-grid">
            {items.map(a => (
              <div key={a.id} className="asset-card" onClick={() => nav('/assets/' + a.id)}>
                <Thumb a={a} />
                <div className="asset-meta">
                  <div className="asset-name" title={a.name}>{a.name}</div>
                  <div className="asset-sub">
                    <span className={`badge badge-${a.category}`}>{a.category}</span>
                    <span>{formatSize(a.size_bytes)}</span>
                  </div>
                  <div className="asset-sub" style={{ marginTop: 6 }}>
                    <span>{formatDate(a.uploaded_at)}</span>
                    {a.share_token && <span style={{ color: '#34d399' }}>🔗 分享</span>}
                  </div>
                  <div>
                    {a.tags.slice(0, 3).map(t => <span key={t} className="tag-chip">#{t}</span>)}
                  </div>
                </div>
                <div style={{ padding: '0 12px 12px' }}>
                  <button onClick={e => { e.stopPropagation(); onDelete(a); }} className="danger" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 50 && (
          <div style={{ marginTop: 20, textAlign: 'center', color: '#9ca3af' }}>
            共 {total} 项 · {page > 1 && <button onClick={() => setPage(p => p - 1)}>上一页</button>}{' '}
            {page * 50 < total && <button onClick={() => setPage(p => p + 1)}>下一页</button>}
          </div>
        )}
      </div>
    </div>
  );
}
