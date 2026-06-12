import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, Alert, TextInput } from 'react-native';
import { api, clearKey, getBase, getKey } from '../api/client';
import type { Asset } from '../types';

const fmt = (b: number) => b < 1024 ? b + 'B' : b < 1024 * 1024 ? (b / 1024).toFixed(1) + 'K' : (b / 1024 / 1024).toFixed(1) + 'M';

export default function ListScreen({ navigation }: any) {
  const [items, setItems] = useState<Asset[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [contentBase, setContentBase] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await api.listAssets({ q });
      setItems(r.items);
    } catch (e: any) { Alert.alert('加载失败', e?.message); }
    setRefreshing(false);
  }, [q]);

  useEffect(() => {
    getBase().then(setContentBase);
    getKey().then(setApiKey);
  }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const logout = async () => {
    await clearKey();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <Text style={styles.title}>CloudAsset</Text>
        <TouchableOpacity onPress={logout}><Text style={styles.link}>登出</Text></TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索…"
          placeholderTextColor="#666"
          value={q}
          onChangeText={setQ}
        />
        <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation.navigate('Upload')}>
          <Text style={styles.uploadBtnText}>＋ 上传</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#a78bfa" />}
        ListEmptyComponent={<Text style={styles.empty}>暂无资产</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Preview', { id: item.id })}>
            <View style={styles.thumb}>
              {item.mime_type.startsWith('image/') ? (
                <Image source={{ uri: contentBase + '/api/assets/' + item.id + '/content', headers: apiKey ? { 'X-API-Key': apiKey } : undefined }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.icon}>{iconFor(item.category)}</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>{item.category} · {fmt(item.size_bytes)} · {new Date(item.uploaded_at).toLocaleDateString()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {item.tags.slice(0, 3).map(t => (
                  <Text key={t} style={styles.tag}>#{t}</Text>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const iconFor = (c: string) => c === 'image' ? '🖼' : c === 'video' ? '🎬' : c === 'audio' ? '🎵' : c === 'code' ? '💻' : c === 'document' ? '📄' : c === 'data' ? '📊' : '📁';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11052c' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: 'rgba(255,255,255,0.04)' },
  title: { color: '#a78bfa', fontSize: 18, fontWeight: '700' },
  link: { color: '#93c5fd', fontSize: 13 },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  uploadBtn: { backgroundColor: '#a78bfa', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  uploadBtnText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  icon: { fontSize: 28 },
  name: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  tag: { color: '#c4b5fd', fontSize: 11, marginRight: 6, backgroundColor: 'rgba(167,139,250,0.18)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
});
