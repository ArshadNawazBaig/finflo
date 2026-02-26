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
import { MemberAuthContext } from '../../context/MemberAuthContext';
import { authApi } from '../../api/auth';
import { colors, typography, spacing } from '../../theme/theme';
import FormInput from '../../components/FormInput';

export default function MemberLoginScreen({ navigation }: any) {
  const { memberLogin } = useContext(MemberAuthContext);
  const [memberId, setMemberId] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!memberId || !businessCode) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please enter Member ID and Business Code');
      } else {
        console.error('Error: Please enter Member ID and Business Code');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.memberLogin({ memberId, businessCode });
      if (response.success && response.token) {
        await memberLogin(response.token, response.member);
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
      <Text style={styles.title}>Member Portal</Text>

      <FormInput
        label="Member ID"
        placeholder="Enter your Member ID"
        value={memberId}
        onChangeText={setMemberId}
        autoCapitalize="characters"
      />

      <FormInput
        label="Business Security Code"
        placeholder="Enter security code"
        value={businessCode}
        onChangeText={setBusinessCode}
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
          <Text style={styles.buttonText}>Access Portal</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>Go to Admin Login</Text>
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
    color: colors.primary,
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
