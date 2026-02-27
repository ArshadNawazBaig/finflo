import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { loansApi } from '../../api/loans';
import { membersApi } from '../../api/members';
import { colors, typography, spacing, radii } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import FormInput from '../../components/FormInput';
import {
  DollarSign,
  Clock,
  User,
  Check,
  Building,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function ApplyLoanScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [principal, setPrincipal] = useState('');
  const [duration, setDuration] = useState('12');
  const [notes, setNotes] = useState('');

  const [grantor1Input, setGrantor1Input] = useState('');
  const [grantor1Valid, setGrantor1Valid] = useState<any>(null);
  const [grantor1Checking, setGrantor1Checking] = useState(false);

  const [grantor2Input, setGrantor2Input] = useState('');
  const [grantor2Valid, setGrantor2Valid] = useState<any>(null);
  const [grantor2Checking, setGrantor2Checking] = useState(false);

  const [defaultRate, setDefaultRate] = useState(0);
  const [error, setError] = useState('');

  // Auto-validate Grantor 1
  useEffect(() => {
    const handleGrantorCheck = async () => {
      if (grantor1Input.length < 3) {
        setGrantor1Valid(null);
        return;
      }
      setGrantor1Checking(true);
      try {
        // Find member by CNIC or Phone
        const data = await membersApi.lookup(grantor1Input);
        if (data && data.length > 0) {
          // Exact match
          const match = data.find(
            (m: any) =>
              m.cnic.includes(grantor1Input) || m.phone.includes(grantor1Input),
          );
          if (match) {
            setGrantor1Valid(match);
          } else {
            setGrantor1Valid(null);
          }
        } else {
          setGrantor1Valid(null);
        }
      } catch {
        setGrantor1Valid(null);
      } finally {
        setGrantor1Checking(false);
      }
    };

    const timeout = setTimeout(handleGrantorCheck, 800);
    return () => clearTimeout(timeout);
  }, [grantor1Input]);

  // Auto-validate Grantor 2
  useEffect(() => {
    const handleGrantorCheck = async () => {
      if (grantor2Input.length < 3) {
        setGrantor2Valid(null);
        return;
      }
      setGrantor2Checking(true);
      try {
        const data = await membersApi.lookup(grantor2Input);
        if (data && data.length > 0) {
          const match = data.find(
            (m: any) =>
              m.cnic.includes(grantor2Input) || m.phone.includes(grantor2Input),
          );
          if (match) {
            setGrantor2Valid(match);
          } else {
            setGrantor2Valid(null);
          }
        } else {
          setGrantor2Valid(null);
        }
      } catch {
        setGrantor2Valid(null);
      } finally {
        setGrantor2Checking(false);
      }
    };

    const timeout = setTimeout(handleGrantorCheck, 800);
    return () => clearTimeout(timeout);
  }, [grantor2Input]);

  const handleSubmit = async () => {
    setError('');

    if (!principal || Number(principal) < 1000) {
      setError('Amount is required and must be at least 1,000');
      return;
    }
    if (!grantor1Valid) {
      setError('Grantor 1 is required and must be a valid member');
      return;
    }
    if (!grantor2Valid) {
      setError('Grantor 2 is required and must be a valid member');
      return;
    }
    if (grantor1Valid._id === grantor2Valid._id) {
      setError('Grantor 1 and Grantor 2 cannot be the same member');
      return;
    }

    setSubmitting(true);
    try {
      await loansApi.requestLoan({
        principal: Number(principal),
        duration: Number(duration),
        notes,
        grantor1Identifier: grantor1Valid.cnic,
        grantor2Identifier: grantor2Valid.cnic,
      });
      // Return to Dashboard or Loans Screen
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const durationOptions = ['3', '6', '9', '12', '18', '24', '36'];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Apply for a Loan" showBack />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerBox}>
          <Building size={32} color={colors.primary} />
          <Text style={styles.title}>New Loan Request</Text>
          <Text style={styles.subtitle}>
            Fill in the required information to apply for a loan.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Loan Details</Text>

          <FormInput
            label="Loan Amount (PKR)"
            placeholder="e.g. 50000"
            value={principal}
            onChangeText={setPrincipal}
            keyboardType="numeric"
            icon={<DollarSign size={18} color={colors.text.muted} />}
          />

          <Text style={styles.label}>Duration (Months)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.durationScroll}
          >
            {durationOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.durationPill,
                  duration === opt && styles.durationPillActive,
                ]}
                onPress={() => setDuration(opt)}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === opt && styles.durationTextActive,
                  ]}
                >
                  {opt} Mo
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FormInput
            label="Purpose / Notes"
            placeholder="Briefly describe why you need this loan..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Reference / Grantors</Text>
          <Text style={styles.helperText}>
            Enter CNIC or Phone Number for verification.
          </Text>

          <View style={styles.grantorBox}>
            <FormInput
              label="Grantor 1"
              placeholder="CNIC or Phone Number"
              value={grantor1Input}
              onChangeText={setGrantor1Input}
              icon={<User size={18} color={colors.text.muted} />}
              keyboardType="phone-pad"
            />
            {grantor1Checking && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.spin}
              />
            )}
            {grantor1Valid && (
              <View style={styles.matchBox}>
                <Check size={14} color={colors.success} />
                <Text style={styles.matchText}>
                  {grantor1Valid.name} has been verified.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.grantorBox}>
            <FormInput
              label="Grantor 2"
              placeholder="CNIC or Phone Number"
              value={grantor2Input}
              onChangeText={setGrantor2Input}
              icon={<User size={18} color={colors.text.muted} />}
              keyboardType="phone-pad"
            />
            {grantor2Checking && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.spin}
              />
            )}
            {grantor2Valid && (
              <View style={styles.matchBox}>
                <Check size={14} color={colors.success} />
                <Text style={styles.matchText}>
                  {grantor2Valid.name} has been verified.
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.screen },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  headerBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: typography.sizes.sm,
  },
  formCard: {
    backgroundColor: colors.background.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: spacing.md,
    marginTop: -8,
  },
  durationScroll: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  durationPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: 'rgba(99,102,241,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
  },
  durationPillActive: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderColor: colors.primary,
  },
  durationText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  durationTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  grantorBox: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  spin: {
    position: 'absolute',
    right: 14,
    top: 40,
  },
  matchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    marginTop: -8,
    marginBottom: 8,
  },
  matchText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
  },
});
