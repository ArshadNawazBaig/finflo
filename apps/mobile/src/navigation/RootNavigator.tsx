import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { MemberAuthContext } from '../context/MemberAuthContext';
import AdminNavigator from './AdminNavigator';
import MemberNavigator from './MemberNavigator';
import AuthNavigator from './AuthNavigator';

// We will create these next
// import AuthNavigator from './AuthNavigator';
// import AdminNavigator from './AdminNavigator';
// import MemberNavigator from './MemberNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading: adminLoading } = useContext(AuthContext);
  const { member, loading: memberLoading } = useContext(MemberAuthContext);

  if (adminLoading || memberLoading) {
    // Could return a splash screen here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Admin is logged in
          <Stack.Screen name="AdminApp" component={AdminNavigator} />
        ) : member ? (
          // Member is logged in
          <Stack.Screen name="MemberApp" component={MemberNavigator} />
        ) : (
          // Not logged in
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
