import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { customersApi } from '../../api/customers';
import { colors, typography, spacing } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import Badge from '../../components/Badge';
import {
  User,
  Mail,
  Smartphone,
  Calendar,
  MapPin,
  Trash2,
  Edit,
  RefreshCw,
} from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { user } = useContext(AuthContext);
  const { id } = route.params || {};
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const data = await customersApi.getById(id);
        setCustomer(data.data || data);
      } catch (error) {
        console.error('Error fetching customer detail:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCustomer();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await customersApi.delete(id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer');
            }
          },
        },
      ],
    );
  };

  const handleConvertToMember = async () => {
    Alert.alert(
      'Convert to Member',
      'This will create a member account for this customer. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              await customersApi.convertToMember(id, {});
              Alert.alert('Success', 'Customer converted to member');
              // Optionally refresh or navigate
            } catch (error) {
              Alert.alert('Error', 'Failed to convert customer');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading customer profile..." />;
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Customer not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Customer Detail" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={40} color={colors.text.secondary} />
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          <Badge label={customer.type || 'Individual'} type="info" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Mail size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>{customer.email || 'No email'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Smartphone size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>
              {customer.phone || 'No phone provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>
              {customer.address || 'No address provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Calendar size={18} color={colors.text.muted} />
            <Text style={styles.infoText}>
              Onboarded: {new Date(customer.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditCustomer', { customer })}
          >
            <Edit size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Edit Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.convertButton]}
            onPress={handleConvertToMember}
          >
            <RefreshCw size={20} color={colors.success} />
            <Text style={[styles.actionButtonText, { color: colors.success }]}>
              Convert to Member
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDelete}
          >
            <Trash2 size={20} color={colors.danger} />
            <Text style={[styles.actionButtonText, { color: colors.danger }]}>
              Delete Customer
            </Text>
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
  profileCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    flex: 1,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: typography.sizes.base,
  },
  convertButton: {
    borderColor: colors.success + '50',
  },
  dangerButton: {
    borderColor: colors.danger + '50',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.text.muted,
  },
});
