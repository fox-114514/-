import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api as _api } from '../api/client';
import { getBase } from '../api/client';

interface PublicAsset {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  uploaded_at: number;
  tags: string[];
}

const formatSize = (b: number) => {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

export default function ShareLanding() {
  const { token } = useParams();
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [err, setErr] = useState('');
  const base = getBase();

  useEffect(() => {
    fetch(`${base}/api/share/${token}`).then(async r => {
      if (!r.ok) { setErr('分享链接无效或已失效'); return; }
      setAsset(await r.json());
    }).catch(() => setErr('网络错误'));
  }, [token, base]);

  if (err) return (
    <div className="content">
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2>{err}</h2>
        <Link to="/">返回主页</Link>
      </div>
    </div>
  );
  if (!asset) return <div className="content">加载中…</div>;

  const contentUrl = `${base}/api/share/${token}/content`;
  const isImage = asset.mime_type.startsWith('image/');
  const isVideo = asset.mime_type.startsWith('video/');
  const isAudio = asset.mime_type.startsWith('audio/');
  const isPDF   = asset.mime_type === 'application/pdf';
  const isText  = asset.mime_type.startsWith('text/');

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{asset.name}</h2>
        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
          {(asset.size_bytes ? formatSize(asset.size_bytes) : '') + ' · ' + new Date(asset.uploaded_at).toLocaleString()}
        </div>
        {asset.description && <p style={{ color: '#d1d5db' }}>{asset.description}</p>}
        {asset.tags.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {asset.tags.map(t => <span key={t} className="tag-chip">#{t}</span>)}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <a href={contentUrl} download={asset.original_name}><button className="primary">下载原文件</button></a>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>预览</h3>
        <div className="preview-box">
          {isImage && <img src={contentUrl} alt={asset.name} style={{ maxWidth: '100%' }} />}
          {isVideo && <video src={contentUrl} controls style={{ maxWidth: '100%' }} />}
          {isAudio && <audio src={contentUrl} controls style={{ width: '100%' }} />}
          {isPDF && <iframe src={contentUrl} style={{ width: '100%', height: '70vh', border: 0 }} title={asset.name} />}
          {isText && <iframe src={contentUrl} style={{ width: '100%', height: '70vh', border: 0, background: '#000' }} title={asset.name} />}
          {!isImage && !isVideo && !isAudio && !isPDF && !isText && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
              该类型不支持在线预览 · 请下载查看
            </div>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, color: '#6b7280', fontSize: '0.78rem' }}>
        由 <strong>CloudAsset</strong> 提供分享
      </div>
    </div>
  );
}
