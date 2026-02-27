import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { authApi } from '../../api/auth';
import { colors, typography, spacing, radii, shadows } from '../../theme/theme';
import FormInput from '../../components/FormInput';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please fill in all fields');
      } else {
        console.error('Error: Please fill in all fields');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({ name, email, password });
      if (response.success) {
        if (typeof Alert.alert === 'function') {
          Alert.alert('Success', 'Account created! Please login.');
        }
        navigation.navigate('Login');
      } else {
        const msg = response.message || 'Registration failed';
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Admin Account</Text>

      <FormInput
        label="Full Name"
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />

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
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    borderRadius: radii.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.glow,
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
