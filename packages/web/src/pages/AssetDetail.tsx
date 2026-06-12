import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, type Asset, formatDate, formatSize } from '../api/client';

export default function AssetDetail() {
  const { id } = useParams();
  const [a, setA] = useState<Asset | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'other', tags: '' });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getAsset(id).then(asset => {
      setA(asset);
      setForm({ name: asset.name, description: asset.description ?? '', category: asset.category, tags: asset.tags.join(', ') });
      const isText = asset.mime_type.startsWith('text/') || /\.(md|txt|csv|json|xml|yaml|yml|js|ts|py|html|css|sql|sh)$/i.test(asset.name);
      if (isText) {
        fetch(api.contentUrl(asset.id), { headers: { 'X-API-Key': localStorage.getItem('cloudasset_key') || '' } })
          .then(r => r.text()).then(t => setText(t.slice(0, 200_000)));
      }
    });
  }, [id]);

  if (!a) return <div className="content">加载中…</div>;

  const save = async () => {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const updated = await api.updateAsset(a.id, { name: form.name, description: form.description || null, category: form.category as any, tags });
    setA(updated);
    setEdit(false);
  };

  const onShare = async () => {
    const r = await api.share(a.id);
    setShareUrl(r.url);
  };
  const onUnshare = async () => {
    await api.unshare(a.id);
    setA({ ...a, share_token: null });
    setShareUrl(null);
  };

  const onDelete = async () => {
    if (!confirm('删除该资产?')) return;
    await api.deleteAsset(a.id);
    nav('/');
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1><Link to="/" style={{ color: 'inherit' }}>CloudAsset</Link></h1>
        <div className="spacer" />
        <Link to="/"><button>返回列表</button></Link>
      </div>
      <div className="content">
        <div className="card" style={{ marginBottom: 16 }}>
          {!edit ? (
            <>
              <h2 style={{ marginTop: 0 }}>{a.name}</h2>
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: 12 }}>
                <span className={`badge badge-${a.category}`}>{a.category}</span> · {a.mime_type} · {formatSize(a.size_bytes)} · {formatDate(a.uploaded_at)}
              </div>
              {a.description && <p style={{ color: '#d1d5db' }}>{a.description}</p>}
              <div style={{ margin: '8px 0' }}>{a.tags.map(t => <span key={t} className="tag-chip">#{t}</span>)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setEdit(true)}>编辑</button>
                {!a.share_token ? <button onClick={onShare}>生成分享链接</button> : (
                  <>
                    <button onClick={() => navigator.clipboard.writeText(`${location.origin}/api/share/${a.share_token}`)}>复制分享链接</button>
                    <button className="danger" onClick={onUnshare}>取消分享</button>
                  </>
                )}
                <a href={api.contentUrl(a.id)} download={a.original_name}><button>下载</button></a>
                <button className="danger" onClick={onDelete}>删除</button>
              </div>
              {shareUrl && <div style={{ marginTop: 12, padding: 10, background: 'rgba(52,211,153,0.1)', borderRadius: 8, fontSize: '0.85rem', color: '#6ee7b7' }}>分享 URL: <code>{shareUrl}</code></div>}
            </>
          ) : (
            <>
              <div className="form-row"><label>名称</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row"><label>描述</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="form-row">
                <label>分类</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {['image','video','audio','document','code','data','other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row"><label>标签 (逗号分隔)</label><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="primary" onClick={save}>保存</button>
                <button onClick={() => setEdit(false)}>取消</button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>预览</h3>
          {a.mime_type.startsWith('image/') ? (
            <div className="preview-box"><img src={api.contentUrl(a.id)} alt={a.name} /></div>
          ) : a.mime_type.startsWith('video/') ? (
            <div className="preview-box"><video src={api.contentUrl(a.id)} controls style={{ width: '100%' }} /></div>
          ) : a.mime_type.startsWith('audio/') ? (
            <div className="preview-box"><audio src={api.contentUrl(a.id)} controls style={{ width: '100%' }} /></div>
          ) : text !== null ? (
            <div className="preview-box"><pre>{text}</pre></div>
          ) : (
            <div className="preview-box" style={{ textAlign: 'center', color: '#9ca3af' }}>该类型不支持在线预览 · 请下载查看</div>
          )}
        </div>
      </div>
    </div>
  );
}
