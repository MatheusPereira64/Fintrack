import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useTransactionStore } from '../../../store/transactionStore';
import { useCategoryStore }    from '../../../store/categoryStore';
import { useAccountStore }     from '../../../store/accountStore';
import { formatCurrency }      from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';

export function TransactionDetailScreen({ route, navigation }: any) {
  const { transactionId } = route.params;
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);

  const transactions      = useTransactionStore(s => s.transactions);
  const deleteTransaction = useTransactionStore(s => s.deleteTransaction);
  const getCategoryById = useCategoryStore(s => s.getCategoryById);
  const accounts        = useAccountStore(s => s.accounts);

  const transaction = transactions.find(t => t.id === transactionId);
  const category    = transaction?.categoryId ? getCategoryById(transaction.categoryId) : undefined;
  const account     = transaction ? accounts.find(a => a.id === transaction.accountId) : undefined;

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[typography.styles.titleSmall, { color: colors.textSecondary }]}>
          {t('transactionDetail.notFound')}
        </Text>
      </View>
    );
  }

  const isIncome   = transaction.amount > 0;
  const amountColor = isIncome ? colors.income : colors.expense;

  const handleDelete = () => {
    Alert.alert(
      t('transactionDetail.deleteTitle'),
      t('transactionDetail.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(transaction.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const DetailRow = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
    <View style={[styles.row, { borderBottomColor: colors.divider, borderBottomWidth: 1, paddingVertical: spacing.md }]}>
      <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.styles.bodyMedium, { color: valueColor ?? colors.text, textAlign: 'right', flex: 1, marginLeft: spacing.base }]}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('transactionDetail.title')}
        onClose={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: colors.error, fontSize: 14 }}>{t('common.delete')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}>
        {/* Card principal */}
        <View style={[styles.mainCard, {
          backgroundColor: isIncome ? colors.incomeBackground : colors.expenseBackground,
          borderRadius: borderRadius['2xl'],
          padding: spacing.xl,
          alignItems: 'center',
          marginBottom: spacing.xl,
          ...shadows.md,
        }]}>
          <Text style={{ fontSize: 48 }}>
            {category?.icon ?? (isIncome ? '📥' : '💸')}
          </Text>
          <Text style={[typography.styles.headlineMedium, { color: amountColor, marginTop: spacing.sm }]}>
            {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
          </Text>
          <Text style={[typography.styles.titleSmall, { color: colors.text, marginTop: spacing.xs, textAlign: 'center' }]}>
            {transaction.description}
          </Text>
          {transaction.sourceNotification && (
            <View style={[styles.autoBadge, {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              marginTop: spacing.sm,
            }]}>
              <Text style={[typography.styles.labelSmall, { color: '#FFF' }]}>
                🤖 {t('transactionDetail.autoRegistered')}
              </Text>
            </View>
          )}
        </View>

        {/* Detalhes */}
        <View style={[{
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          ...shadows.sm,
        }]}>
          <DetailRow
            label={t('transactionDetail.type')}
            value={isIncome ? `📥 ${t('transactionDetail.income')}` : `📤 ${t('transactionDetail.expense')}`}
          />
          <DetailRow
            label={t('transactionDetail.category')}
            value={category ? `${category.icon ?? ''} ${category.name}` : t('transactionDetail.noCategory')}
          />
          <DetailRow
            label={t('transactionDetail.account')}
            value={account?.name ?? t('transactionDetail.unknownAccount')}
          />
          <DetailRow label={t('transactionDetail.date')} value={formatDate(transaction.date, 'long')} />
          <DetailRow label={t('transactionDetail.bank')} value={transaction.bankName ?? '—'} />
          <DetailRow
            label={t('transactionDetail.recurring')}
            value={transaction.isRecurring ? t('common.yes') : t('common.no')}
          />
          {transaction.sourceNotification && (
            <View style={{ paddingVertical: spacing.md }}>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary }]}>
                {t('transactionDetail.originalNotification')}
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textTertiary, marginTop: 4 }]}>
                {transaction.sourceNotification}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { padding: 4 },
  mainCard: {},
  autoBadge: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
