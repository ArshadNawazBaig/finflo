import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { loanProductsApi } from '../../api/loanProducts';
import { colors, typography, spacing } from '../../theme/theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import { BookOpen, ChevronRight, TrendingUp, Clock } from 'lucide-react-native';

export default function LoanProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = async () => {
    try {
      const data = await loanProductsApi.getAll();
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching loan products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // navigation.navigate('LoanProductDetail', { id: item._id });
      }}
    >
      <View style={styles.iconContainer}>
        <BookOpen size={24} color={colors.primary} />
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Badge
            label={item.isActive ? 'Active' : 'Inactive'}
            type={item.isActive ? 'success' : 'danger'}
          />
        </View>
        <Text style={styles.description} numberOfLines={1}>
          {item.description || 'Standardized loan product terms'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <TrendingUp size={14} color={colors.success} />
            <Text style={styles.statText}>{item.interestRate}% Int.</Text>
          </View>
          <View style={styles.stat}>
            <Clock size={14} color={colors.text.muted} />
            <Text style={styles.statText}>{item.duration} Mos.</Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <LoadingSpinner message="Fetching products..." />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Loan Products" showBack />
      <FlatList
        data={products}
        renderItem={renderProduct}
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
            message="No products found"
            icon={BookOpen}
            description="Templates for issuing standardized loans."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  list: {
    padding: spacing.md,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  description: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
