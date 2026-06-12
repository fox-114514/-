import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../api/client';

export default function UploadScreen({ navigation }: any) {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({});
    if (!r.canceled && r.assets && r.assets[0]) {
      setFile(r.assets[0]);
      if (!name) setName(r.assets[0].name);
    }
  };

  const upload = async () => {
    if (!file) { Alert.alert('请先选择文件'); return; }
    setBusy(true);
    try {
      await api.uploadMultipart(
        { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' },
        { name: name || file.name, tags },
      );
      Alert.alert('上传成功', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('上传失败', e?.message || '未知错误');
    }
    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>← 返回</Text></TouchableOpacity>
        <Text style={styles.title}>上传</Text>
        <View style={{ width: 50 }} />
      </View>
      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.pickBtn} onPress={pick}>
          <Text style={styles.pickBtnText}>{file ? file.name : '📤 选择文件'}</Text>
        </TouchableOpacity>
        <Text style={styles.label}>名称</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#666" />
        <Text style={styles.label}>标签 (逗号分隔)</Text>
        <TextInput style={styles.input} value={tags} onChangeText={setTags} placeholderTextColor="#666" />
        <TouchableOpacity style={styles.btn} onPress={upload} disabled={busy || !file}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>上传</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11052c' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#93c5fd', fontSize: 14 },
  pickBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', marginBottom: 16 },
  pickBtnText: { color: '#d1d5db', fontSize: 14 },
  label: { color: '#9ca3af', fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btn: { backgroundColor: '#a78bfa', padding: 14, borderRadius: 8, marginTop: 24, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
