import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { setKey, setBase, getBase } from '../api/client';

export default function LoginScreen({ navigation }: any) {
  const [base, setBaseInput] = useState('');
  const [key, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { getBase().then(b => setBaseInput(b)); }, []);

  const submit = async () => {
    if (!key.trim()) { Alert.alert('请输入 API Key'); return; }
    setLoading(true);
    try {
      const baseUrl = base.trim() || 'https://your-server.example.com';
      await setBase(baseUrl);
      await setKey(key.trim());
      const res = await fetch(baseUrl + '/api/health', {
        headers: { 'X-API-Key': key.trim() },
      });
      if (!res.ok) throw new Error('服务器不可达或 Key 无效');
      navigation.replace('List');
    } catch (e: any) {
      Alert.alert('连接失败', e?.message || '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CloudAsset</Text>
      <Text style={styles.hint}>云上资产库</Text>
      <Text style={styles.label}>服务器地址</Text>
      <TextInput style={styles.input} value={base} onChangeText={setBaseInput} placeholder="https://asset.example.com" placeholderTextColor="#666" autoCapitalize="none" autoCorrect={false} />
      <Text style={styles.label}>API Key</Text>
      <TextInput style={styles.input} value={key} onChangeText={setKeyInput} secureTextEntry placeholder="X-API-Key" placeholderTextColor="#666" autoCapitalize="none" autoCorrect={false} />
      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '连接中…' : '连接'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#11052c' },
  title: { fontSize: 32, color: '#a78bfa', fontWeight: '700', textAlign: 'center' },
  hint: { color: '#9ca3af', textAlign: 'center', marginBottom: 30, marginTop: 4 },
  label: { color: '#9ca3af', fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btn: { backgroundColor: '#a78bfa', padding: 14, borderRadius: 8, marginTop: 24, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
