import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing } from '../../theme/theme';
import { Send, User, ChevronRight } from 'lucide-react-native';
import { MemberAuthContext } from '../../context/MemberAuthContext';

export default function MemberTransferScreen() {
  const { member } = React.useContext(MemberAuthContext);
  const currencySymbol = (member as any)?.currency || 'Rs.';
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = () => {
    if (!recipient || !amount) {
      if (typeof Alert.alert === 'function') {
        Alert.alert('Error', 'Please enter recipient and amount');
      }
      return;
    }

    setLoading(true);
    // Simulating transfer
    setTimeout(() => {
      setLoading(false);
      if (typeof Alert.alert === 'function') {
        Alert.alert('Success', 'Transfer initiated successfully');
      }
      setRecipient('');
      setAmount('');
      setNote('');
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Transfer Funds</Text>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Recipient Member ID</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="e.g. MEM-12345"
            placeholderTextColor={colors.text.muted}
            value={recipient}
            onChangeText={setRecipient}
          />
          <User size={20} color={colors.text.muted} />
        </View>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Amount ({currencySymbol})</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={colors.text.muted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's this for?"
          placeholderTextColor={colors.text.muted}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={styles.transferButton}
        onPress={handleTransfer}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Send size={20} color="white" />
            <Text style={styles.transferButtonText}>Send Money</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.favoritesSection}>
        <Text style={styles.sectionTitle}>Recent Recipients</Text>
        <View style={styles.emptyRecent}>
          <Text style={styles.emptyText}>No recent transfers found</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
    padding: spacing.md,
  },
  header: {
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.card,
    color: colors.text.primary,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  transferButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  transferButtonText: {
    color: 'white',
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
  },
  favoritesSection: {
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyRecent: {
    padding: spacing.xl,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: colors.text.muted,
  },
});
