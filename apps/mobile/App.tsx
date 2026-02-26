import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { MemberAuthProvider } from './src/context/MemberAuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MemberAuthProvider>
          <RootNavigator />
        </MemberAuthProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
