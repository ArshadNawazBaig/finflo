import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { customersApi } from '../../api/customers';
import { colors, typography, spacing } from '../../theme/theme';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { User, ChevronRight, Search, Plus } from 'lucide-react-native';
import AppHeader from '../../components/AppHeader';

export default function CustomersScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await customersApi.getAll({ search: searchTerm });
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const renderCustomer = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('CustomerDetail', { id: item._id });
      }}
    >
      <View style={styles.avatarContainer}>
        <User size={24} color={colors.text.secondary} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email || 'No email'}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.phone}>{item.phone || 'No phone'}</Text>
          <Badge label={item.type || 'Individual'} type="info" />
        </View>
      </View>

      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  if (loading && !refreshing && customers.length === 0) {
    return <LoadingSpinner message="Fetching customers..." />;
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Customers"
        showBack={true}
        rightElement={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddCustomer')}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        }
      />
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Search
            size={20}
            color={colors.text.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor={colors.text.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              message="No customers found"
              icon={User}
              description="Start onboarding new clients to see them here."
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  header: {
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.text.primary,
    fontSize: typography.sizes.base,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  email: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phone: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
