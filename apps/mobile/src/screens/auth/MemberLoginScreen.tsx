import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Mail, Lock, Hash, ArrowRight, Users } from 'lucide-react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';
import { authApi } from '../../api/auth';
import { colors, typography, spacing, radii, shadows } from '../../theme/theme';
import FormInput from '../../components/FormInput';
import Logo from '../../components/Logo';

export default function MemberLoginScreen({ navigation }: any) {
  const { memberLogin } = useContext(MemberAuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password || !securityCode) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.memberLogin({
        email: email.toLowerCase().trim(),
        password,
        securityCode,
      });
      if (response.token) {
        // Backend returns { token, _id, name, role, ... } directly
        await memberLogin(response.token, response);
      } else if (response.twoFactorRequired) {
        Alert.alert(
          '2FA Required',
          'Please complete two-factor authentication.',
        );
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid credentials.');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'Could not connect to server. Check your network.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.screen}
      />

      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Logo size={52} showText subtitle="Member Portal" />
          </View>

          <View style={styles.card}>
            <View style={styles.badge}>
              <Users size={10} color={colors.secondary} />
              <Text style={styles.badgeText}>MEMBER LOGIN</Text>
            </View>

            <Text style={styles.heading}>Member Portal</Text>
            <Text style={styles.subheading}>
              Access your investment and loan dashboard
            </Text>

            <View style={styles.form}>
              <FormInput
                label="Email Address"
                placeholder="your.email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<Mail size={16} color={colors.text.muted} />}
              />
              <FormInput
                label="Business Security Code"
                placeholder="Your organization code"
                value={securityCode}
                onChangeText={setSecurityCode}
                autoCapitalize="characters"
                icon={<Hash size={16} color={colors.text.muted} />}
              />
              <FormInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon={<Lock size={16} color={colors.text.muted} />}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
              {!loading && <ArrowRight size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Admin or Manager?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}> Admin Portal →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.screen },
  flex: { flex: 1 },
  orb: { position: 'absolute', borderRadius: radii.full, opacity: 0.15 },
  orb1: {
    width: 260,
    height: 260,
    top: -70,
    left: -70,
    backgroundColor: colors.primary,
  },
  orb2: {
    width: 200,
    height: 200,
    bottom: -50,
    right: -50,
    backgroundColor: colors.accent,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: spacing['2xl'] },
  card: {
    backgroundColor: colors.background.glass,
    borderRadius: radii['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...shadows.card,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondary + '20',
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 2,
  },
  heading: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subheading: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  form: { gap: 2 },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
    marginTop: -8,
  },
  forgotText: {
    color: colors.text.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: radii.xl,
    marginTop: spacing.sm,
    ...shadows.glow,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  switchLabel: { color: colors.text.muted, fontSize: typography.sizes.sm },
  switchLink: {
    color: colors.secondary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
