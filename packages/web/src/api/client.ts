export interface Asset {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  description: string | null;
  content_hash: string | null;
  uploaded_at: number;
  updated_at: number;
  share_token: string | null;
  tags: string[];
}

export interface ListResp {
  total: number;
  page: number;
  limit: number;
  items: Asset[];
}

const KEY = 'cloudasset_key';
const BASE = 'cloudasset_base';

export function getKey(): string | null { return localStorage.getItem(KEY); }
export function setKey(k: string): void { localStorage.setItem(KEY, k); }
export function clearKey(): void { localStorage.removeItem(KEY); }
export function getBase(): string {
  return localStorage.getItem(BASE) || '';
}
export function setBase(b: string): void { localStorage.setItem(BASE, b); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = getKey();
  const base = getBase();
  const url = (base || '') + path;
  const headers: Record<string, string> = {
    ...(init.headers as any || {}),
  };
  if (key) headers['X-API-Key'] = key;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}

export async function fetchAssetBlobUrl(id: string): Promise<string> {
  const key = getKey();
  const res = await fetch(api.contentUrl(id), {
    headers: key ? { 'X-API-Key': key } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return URL.createObjectURL(await res.blob());
}

export const api = {
  listAssets(params: { q?: string; category?: string; tag?: string; page?: number; limit?: number } = {}): Promise<ListResp> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
    return request<ListResp>('/api/assets?' + qs.toString());
  },
  getAsset(id: string): Promise<Asset> { return request<Asset>('/api/assets/' + id); },
  contentUrl(id: string): string { return (getBase() || '') + '/api/assets/' + id + '/content'; },
  publicShareUrl(token: string): string { return `${getBase() || location.origin}/#/s/${token}`; },
  async downloadAsset(id: string, filename: string): Promise<void> {
    const url = await fetchAssetBlobUrl(id);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  },
  async upload(file: File, opts: { name?: string; description?: string; category?: string; tags?: string } = {}): Promise<Asset> {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.name) fd.append('name', opts.name);
    if (opts.description) fd.append('description', opts.description);
    if (opts.category) fd.append('category', opts.category);
    if (opts.tags) fd.append('tags', opts.tags);
    return request<Asset>('/api/assets/upload', { method: 'POST', body: fd });
  },
  updateAsset(id: string, patch: Partial<Pick<Asset, 'name' | 'description' | 'category' | 'tags'>>): Promise<Asset> {
    return request<Asset>('/api/assets/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
  },
  deleteAsset(id: string): Promise<{ ok: true }> { return request('/api/assets/' + id, { method: 'DELETE' }); },
  listTags(): Promise<{ tags: string[] }> { return request('/api/tags'); },
  share(id: string): Promise<{ share_token: string; url: string }> { return request('/api/assets/' + id + '/share', { method: 'POST' }); },
  unshare(id: string): Promise<{ ok: true }> { return request('/api/assets/' + id + '/share', { method: 'DELETE' }); },
};

export function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}
