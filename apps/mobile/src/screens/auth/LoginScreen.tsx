import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { colors, typography, spacing } from '../../theme/theme';
import FormInput from '../../components/FormInput';

export default function LoginScreen({ navigation }: any) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please enter email and password');
      } else {
        console.error('Error: Please enter email and password');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.token) {
        await login(response.token, response.user);
      } else {
        const msg = response.message || 'Login failed';
        if (typeof Alert.alert === 'function') {
          Alert.alert('Error', msg);
        } else {
          console.error('Error:', msg);
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Something went wrong';
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', msg);
      } else {
        console.error('Error:', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Login</Text>

      <FormInput
        label="Email Address"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('MemberLogin')}
      >
        <Text style={styles.linkText}>Go to Member Portal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.background.card,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.sizes.base,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: typography.sizes.lg,
  },
  linkButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    color: colors.info,
    fontSize: typography.sizes.base,
  },
});
