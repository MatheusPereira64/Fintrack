import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { PendingReviewRepository } from '../../../database/repositories/PendingReviewRepository';
import {
  acceptPendingReview,
  ignorePendingReview,
} from '../services/NotificationParser';
import { PendingReview, TransactionType } from '../../../models/types';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore } from '../../../store/accountStore';
import { useCategoryStore } from '../../../store/categoryStore';
import { useReviewStore } from '../../../store/reviewStore';
import { invalidateAccountCache } from '../../../services/accountCache';

const TYPES: Array<{ key: TransactionType; labelKey: string }> = [
  { key: 'expense', labelKey: 'addTransaction.expense' },
  { key: 'income', labelKey: 'addTransaction.income' },
];

interface Props {
  navigation: any;
  route: { params: { reviewId: number } };
}

export function ReviewDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(40);
  const reviewId = route.params.reviewId;

  const categories = useCategoryStore(s => s.categories);
  const ingestAutoTransaction = useTransactionStore(s => s.ingestAutoTransaction);
  const refreshTotalBalance = useAccountStore(s => s.refreshTotalBalance);
  const refreshCounts = useReviewStore(s => s.refreshCounts);

  const [review, setReview] = useState<PendingReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outros');
  const [bankName, setBankName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await PendingReviewRepository.findById(reviewId);
      if (!row || row.status !== 'pending') {
        Alert.alert(t('common.warning'), t('reviewQueue.notFound'));
        navigation.goBack();
        return;
      }
      setReview(row);
      setType(row.proposedType);
      setAmount(Math.abs(row.proposedAmount).toFixed(2).replace('.', ','));
      setDescription(row.proposedDescription);
      setCategory(row.proposedCategory);
      setBankName(row.proposedBankName);
    } finally {
      setLoading(false);
    }
  }, [reviewId, navigation, t]);

  useEffect(() => { void load(); }, [load]);

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }, [amount]);

  const categoryOptions = useMemo(() => {
    const names = categories.map(c => c.name);
    if (!names.includes(category)) names.unshift(category);
    return names;
  }, [categories, category]);

  const handleAccept = async () => {
    if (parsedAmount <= 0 || !description.trim()) {
      Alert.alert(t('common.warning'), t('reviewQueue.validationError'));
      return;
    }
    setSaving(true);
    try {
      const result = await acceptPendingReview(reviewId, {
        type,
        category,
        amount: parsedAmount,
        description: description.trim(),
        bankName: bankName.trim() || review?.proposedBankName || 'Banco',
      });
      if (!result.success || !result.inserted || !result.transaction) {
        Alert.alert(t('common.error'), result.error ?? t('reviewQueue.saveError'));
        return;
      }
      invalidateAccountCache();
      await ingestAutoTransaction(result.inserted);
      await refreshTotalBalance();
      await refreshCounts();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('reviewQueue.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleIgnore = () => {
    Alert.alert(
      t('reviewQueue.ignoreTitle'),
      t('reviewQueue.ignoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('reviewQueue.ignore'),
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await ignorePendingReview(reviewId);
              await refreshCounts();
              navigation.goBack();
            } catch {
              Alert.alert(t('common.error'), t('reviewQueue.saveError'));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (loading || !review) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={t('reviewQueue.detailTitle')}
        onClose={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('reviewQueue.rawNotification')}
        </Text>
        <View style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          marginBottom: spacing.lg,
        }}>
          <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{review.title}</Text>
          <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
            {review.body}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 8 }]}>
            {review.packageName}
          </Text>
        </View>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.type')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {TYPES.map(item => {
            const active = type === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setType(item.key)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: active ? colors.primary : colors.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.styles.bodySmall, {
                  color: active ? '#FFF' : colors.text,
                  fontWeight: '600',
                }]}>
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.amountLabel')}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={t('common.amountPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.description')}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('reviewQueue.bankName')}
        </Text>
        <TextInput
          value={bankName}
          onChangeText={setBankName}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.category')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.xl }}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {categoryOptions.slice(0, 40).map(name => {
            const active = category === name;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => setCategory(name)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: active ? colors.primary : colors.surfaceVariant,
                }}
              >
                <Text style={{
                  color: active ? '#FFF' : colors.text,
                  fontSize: 13,
                  fontWeight: '500',
                }}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={handleAccept}
          disabled={saving}
          style={{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
            marginBottom: spacing.sm,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>
            {t('reviewQueue.accept')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleIgnore}
          disabled={saving}
          style={{
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
            {t('reviewQueue.ignore')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
