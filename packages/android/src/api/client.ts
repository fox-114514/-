import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from '../types';

const KEY = 'cloudasset_key';
const BASE = 'cloudasset_base';

export async function getKey(): Promise<string | null> { return AsyncStorage.getItem(KEY); }
export async function setKey(k: string): Promise<void> { await AsyncStorage.setItem(KEY, k); }
export async function clearKey(): Promise<void> { await AsyncStorage.removeItem(KEY); }
export async function getBase(): Promise<string> { return (await AsyncStorage.getItem(BASE)) || ''; }
export async function setBase(b: string): Promise<void> { await AsyncStorage.setItem(BASE, b); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = await getKey();
  const base = await getBase();
  const url = (base || '') + path;
  const headers: Record<string, string> = { ...(init.headers as any || {}) };
  if (key) headers['X-API-Key'] = key;
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}

export const api = {
  async listAssets(params: { q?: string; category?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
    return request<{ total: number; page: number; limit: number; items: Asset[] }>('/api/assets?' + qs.toString());
  },
  async contentUrl(id: string) {
    const base = await getBase();
    return base + '/api/assets/' + id + '/content';
  },
  // multipart 上传（RN/Expo 兼容）
  async uploadMultipart(file: { uri: string; name: string; type: string }, opts: { name?: string; description?: string; tags?: string } = {}): Promise<Asset> {
    const key = await getKey();
    const base = await getBase();
    const fd = new FormData();
    // React Native 的 FormData 接受 { uri, name, type } 对象
    (fd as any).append('file', file as any);
    if (opts.name) fd.append('name', opts.name);
    if (opts.description) fd.append('description', opts.description);
    if (opts.tags) fd.append('tags', opts.tags);
    const res = await fetch(base + '/api/assets/upload', {
      method: 'POST',
      headers: key ? { 'X-API-Key': key } : {},
      body: fd as any,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  },
  async share(id: string) {
    return request<{ share_token: string; url: string }>('/api/assets/' + id + '/share', { method: 'POST' });
  },
  async delete(id: string) {
    return request<{ ok: true }>('/api/assets/' + id, { method: 'DELETE' });
  },
  async getAsset(id: string) {
    return request<Asset>('/api/assets/' + id);
  },
};
