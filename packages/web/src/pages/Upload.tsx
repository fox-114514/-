import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!name) setName(f.name); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr('请选择文件'); return; }
    setErr(''); setProgress(0);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', (localStorage.getItem('cloudasset_base') || '') + '/api/assets/upload');
      xhr.setRequestHeader('X-API-Key', localStorage.getItem('cloudasset_key') || '');
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round(e.loaded / e.total * 100));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const asset = JSON.parse(xhr.responseText);
          nav('/assets/' + asset.id);
        } else {
          setErr(xhr.responseText || `HTTP ${xhr.status}`);
        }
      };
      xhr.onerror = () => setErr('网络错误');
      const fd = new FormData();
      fd.append('file', file);
      if (name) fd.append('name', name);
      if (desc) fd.append('description', desc);
      if (tags) fd.append('tags', tags);
      xhr.send(fd);
    } catch (e: any) { setErr(e?.message || '上传失败'); }
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>CloudAsset</h1>
        <div className="spacer" />
        <button onClick={() => nav('/')}>返回</button>
      </div>
      <div className="content" style={{ maxWidth: 720 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>上传资产</h2>
          <form onSubmit={submit}>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('file-input')?.click()}
              style={{
                border: '2px dashed ' + (dragOver ? '#a78bfa' : 'rgba(255,255,255,0.18)'),
                borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📤</div>
              <div>{file ? file.name : '拖拽文件到此 或 点击选择'}</div>
              {file && <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 6 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>}
              <input id="file-input" type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!name) setName(f.name); } }} />
            </div>
            <div className="form-row"><label>名称</label><input value={name} onChange={e => setName(e.target.value)} placeholder="留空使用文件名" /></div>
            <div className="form-row"><label>描述</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
            <div className="form-row"><label>标签 (逗号分隔)</label><input value={tags} onChange={e => setTags(e.target.value)} placeholder="aigc, banner, v1" /></div>
            {progress !== null && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: progress + '%', background: 'linear-gradient(90deg,#a78bfa,#60a5fa)', height: '100%' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 4 }}>{progress}%</div>
              </div>
            )}
            {err && <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 12 }}>{err}</div>}
            <button className="primary" type="submit" disabled={!file}>上传</button>
          </form>
        </div>
      </div>
    </div>
  );
}
