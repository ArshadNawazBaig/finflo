import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import api from '../api/axios';
import { colors, typography, spacing } from '../theme/theme';
import { Clock } from 'lucide-react-native';

interface ActivityLog {
  _id: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function ActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const response = await api.get('/activity-logs?limit=5');
      if (response.data && response.data.logs) {
        setLogs(response.data.logs);
      }
    } catch (err: any) {
      console.error('Failed to fetch activity logs', err);
      setError('Unable to load recent activity.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No recent activity found.</Text>
      </View>
    );
  }

  const renderLog = ({ item }: { item: ActivityLog }) => {
    const date = new Date(item.createdAt);
    const timeString = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateString = date.toLocaleDateString();

    return (
      <View style={styles.logItem}>
        <View style={styles.iconContainer}>
          <Clock size={16} color={colors.primary} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logAction}>
            {item.action.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <Text style={styles.logDetails}>{item.details}</Text>
          <Text style={styles.logDate}>
            {dateString} at {timeString}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {logs.map((log) => (
        <React.Fragment key={log._id}>
          {renderLog({ item: log })}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  centerContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 150,
  },
  logItem: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    marginRight: spacing.md,
    justifyContent: 'flex-start',
    paddingTop: spacing.xs,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: typography.sizes.sm,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  logDetails: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  logDate: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sizes.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
  },
});
