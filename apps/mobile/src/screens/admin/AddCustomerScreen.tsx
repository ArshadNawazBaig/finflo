import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { customersApi } from '../../api/customers';
import { branchesApi } from '../../api/branches';
import { colors, typography, spacing, shadows } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import FormInput from '../../components/FormInput';
import {
  User,
  Mail,
  Smartphone,
  MapPin,
  Hash,
  Briefcase,
  Landmark,
} from 'lucide-react-native';

export default function AddCustomerScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cnic: '',
    job: '',
    monthlyIncome: '',
    branchId: '',
  });

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await branchesApi.getAll();
        setBranches(data || []);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      }
    };
    fetchBranches();
  }, []);

  const handleInputChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.cnic
    ) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await customersApi.create({
        ...formData,
        monthlyIncome: formData.monthlyIncome
          ? Number(formData.monthlyIncome)
          : undefined,
      });
      Alert.alert('Success', 'Customer registered successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to register customer',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Add Customer" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <FormInput
            label="Full Name *"
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(val) => handleInputChange('name', val)}
            icon={<User size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="Email Address *"
            placeholder="john@example.com"
            value={formData.email}
            onChangeText={(val) => handleInputChange('email', val)}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="Phone Number *"
            placeholder="+92 XXX XXXXXXX"
            value={formData.phone}
            onChangeText={(val) => handleInputChange('phone', val)}
            keyboardType="phone-pad"
            icon={<Smartphone size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="CNIC Number *"
            placeholder="00000-0000000-0"
            value={formData.cnic}
            onChangeText={(val) => handleInputChange('cnic', val)}
            icon={<Hash size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="Occupation"
            placeholder="e.g. Business Owner"
            value={formData.job}
            onChangeText={(val) => handleInputChange('job', val)}
            icon={<Briefcase size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="Monthly Income"
            placeholder="0.00"
            value={formData.monthlyIncome}
            onChangeText={(val) => handleInputChange('monthlyIncome', val)}
            keyboardType="numeric"
            icon={<Landmark size={18} color={colors.text.muted} />}
          />

          <FormInput
            label="Residential Address"
            placeholder="Full home address"
            value={formData.address}
            onChangeText={(val) => handleInputChange('address', val)}
            multiline
            numberOfLines={3}
            icon={<MapPin size={18} color={colors.text.muted} />}
          />

          {/* Simple Branch Selector (placeholder for now as it needs a specialized picker component) */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Branch</Text>
            {branches.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.branchList}
              >
                {branches.map((b) => (
                  <TouchableOpacity
                    key={b._id}
                    style={[
                      styles.branchTab,
                      formData.branchId === b._id && styles.branchTabActive,
                    ]}
                    onPress={() => handleInputChange('branchId', b._id)}
                  >
                    <Text
                      style={[
                        styles.branchTabText,
                        formData.branchId === b._id &&
                          styles.branchTabTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noBranches}>Loading branches...</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Register Customer</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    paddingLeft: 4,
  },
  branchList: {
    flexDirection: 'row',
  },
  branchTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  branchTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  branchTabText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  branchTabTextActive: {
    color: 'white',
  },
  noBranches: {
    color: colors.text.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
  },
});
