import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { authApi } from '../../api/auth';
import { colors, typography, spacing } from '../../theme/theme';
import FormInput from '../../components/FormInput';

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { token } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    if (password !== confirmPassword) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Passwords do not match');
      }
      return;
    }

    if (!token) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Invalid reset token');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword(token, { password });
      if (response.success) {
        if (typeof Alert.alert === 'function') {
          Alert.alert('Success', 'Password has been reset successfully');
        }
        navigation.navigate('Login');
      } else {
        const msg = response.message || 'Reset failed';
        if (typeof Alert.alert === 'function') {
          Alert.alert('Error', msg);
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Something went wrong';
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Password</Text>
      <Text style={styles.subtitle}>Enter your new password below.</Text>

      <FormInput
        label="New Password"
        placeholder="Enter new password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <FormInput
        label="Confirm Password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
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
});
