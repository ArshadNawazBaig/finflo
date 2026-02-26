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

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please enter your email');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email });
      if (response.success) {
        if (typeof Alert.alert === 'function') {
          Alert.alert(
            'Success',
            'Password reset instructions sent to your email',
          );
        }
        navigation.navigate('Login');
      } else {
        const msg = response.message || 'Request failed';
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
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your
        password.
      </Text>

      <FormInput
        label="Email Address"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleForgot}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Text style={styles.buttonText}>Send Instructions</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>Back to Login</Text>
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
  linkButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    color: colors.info,
    fontSize: typography.sizes.base,
  },
});
