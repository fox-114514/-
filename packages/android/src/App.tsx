import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import ListScreen from './screens/ListScreen';
import UploadScreen from './screens/UploadScreen';
import PreviewScreen from './screens/PreviewScreen';
import { getKey } from './api/client';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initial, setInitial] = useState<string | null>(null);

  useEffect(() => {
    setInitial(getKey() ? 'List' : 'Login');
  }, []);

  if (!initial) return null;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initial}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#11052c' } }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="List" component={ListScreen} />
        <Stack.Screen name="Upload" component={UploadScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
