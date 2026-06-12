import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { api, getBase, getKey } from '../api/client';

export default function PreviewScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [asset, setAsset] = useState<any>(null);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    getKey().then(setApiKey);
    api.getAsset(id).then(a => {
      setAsset(a);
      if (a.mime_type.startsWith('image/')) {
        api.contentUrl(id).then(setImgUri);
      }
    }).catch((e: any) => Alert.alert('加载失败', e?.message));
  }, [id]);

  const onShare = async () => {
    try {
      const r = await api.share(id);
      Alert.alert('分享链接', r.url);
    } catch (e: any) { Alert.alert('失败', e?.message); }
  };

  const onDelete = async () => {
    Alert.alert('确认删除?', '', [
      { text: '取消' },
      { text: '删除', style: 'destructive', onPress: async () => { await api.delete(id); navigation.goBack(); } },
    ]);
  };

  if (!asset) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color="#a78bfa" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>← 返回</Text></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{asset.name}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {imgUri && <Image source={{ uri: imgUri, headers: apiKey ? { 'X-API-Key': apiKey } : undefined }} style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }} resizeMode="contain" />}
        {asset.mime_type.startsWith('video/') && (
          <Text style={{ color: '#9ca3af' }}>视频请在 Web 端预览</Text>
        )}
        {asset.mime_type.startsWith('audio/') && (
          <Text style={{ color: '#9ca3af' }}>音频请在 Web 端预览</Text>
        )}
        <Text style={styles.meta}>分类 · {asset.category}</Text>
        <Text style={styles.meta}>类型 · {asset.mime_type}</Text>
        <Text style={styles.meta}>大小 · {(asset.size_bytes / 1024 / 1024).toFixed(2)} MB</Text>
        {asset.description && <Text style={styles.desc}>{asset.description}</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {asset.tags.map((t: string) => <Text key={t} style={styles.tag}>#{t}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          <TouchableOpacity style={styles.btn} onPress={onShare}><Text style={styles.btnText}>生成分享</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={onDelete}><Text style={styles.btnText}>删除</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11052c' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  link: { color: '#93c5fd', fontSize: 14 },
  meta: { color: '#9ca3af', fontSize: 13, marginTop: 8 },
  desc: { color: '#d1d5db', marginTop: 12, lineHeight: 20 },
  tag: { color: '#c4b5fd', fontSize: 12, marginRight: 6, backgroundColor: 'rgba(167,139,250,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  btn: { backgroundColor: '#a78bfa', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
