import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useAccountStore } from '../../../store/accountStore';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import {
  getAccountInvoiceCycle,
  resolveUsedLimit,
} from '../../../services/CreditCardCycleService';
import {
  loadUpcomingInstallmentsForAccount,
  UpcomingInstallment,
} from '../../../services/CreditCardInstallmentService';

export function AccountCreditScreen({ route, navigation }: any) {
  const { accountId } = route.params as { accountId: number };
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const account = useAccountStore(s => s.accounts.find(a => a.id === accountId));

  const [upcoming, setUpcoming] = useState<UpcomingInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  const cycle = useMemo(
    () => (account ? getAccountInvoiceCycle(account) : null),
    [account],
  );

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const list = await loadUpcomingInstallmentsForAccount(account, 12);
      setUpcoming(list);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => { load(); }, [load]);

  if (!account || account.type !== 'credit_card') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title={t('accountCredit.title')} onClose={() => navigation.goBack()} />
        <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, padding: spacing.base }]}>
          {t('accountCredit.notFound')}
        </Text>
      </View>
    );
  }

  const used = resolveUsedLimit(account);
  const statusKey = cycle?.status ?? 'unknown';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('accountCredit.title')}
        subtitle={account.name}
        onClose={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 24 }}>
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          marginBottom: spacing.md,
          ...shadows.sm,
        }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary }]}>
            {t('accountCredit.currentInvoice')}
          </Text>
          <Text style={[typography.styles.headlineSmall, { color: colors.text, marginTop: 4 }]}>
            {formatCurrency(account.invoiceAmount ?? 0)}
          </Text>

          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary }]}>
              {t('accountCredit.cycleStatus')}
            </Text>
            <Text style={[typography.styles.titleSmall, {
              color: statusKey === 'overdue' ? colors.error
                : statusKey === 'closed' ? colors.warning
                : statusKey === 'open' ? colors.success
                : colors.textSecondary,
            }]}>
              {t(`accountCard.cycle.${statusKey}`)}
            </Text>
          </View>

          {cycle && cycle.status !== 'unknown' && (
            <>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary }]}>
                  {t('accountCredit.closingDay')}
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.text }]}>
                  {t('accountCredit.dayOfMonth', { day: cycle.closingDay })}
                  {cycle.nextClosingDate ? ` · ${formatDate(cycle.nextClosingDate, 'short')}` : ''}
                </Text>
              </View>
              <View style={[styles.row, { marginTop: spacing.xs }]}>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary }]}>
                  {t('accountCredit.dueDay')}
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.text }]}>
                  {t('accountCredit.dayOfMonth', { day: cycle.dueDay })}
                  {cycle.nextDueDate ? ` · ${formatDate(cycle.nextDueDate, 'short')}` : ''}
                </Text>
              </View>
            </>
          )}

          <View style={[styles.row, { marginTop: spacing.md }]}>
            <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary }]}>
              {t('accountCredit.usedLimit')}
            </Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
              {account.limit != null
                ? `${formatCurrency(used)} / ${formatCurrency(account.limit)}`
                : formatCurrency(used)}
            </Text>
          </View>
          <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
            {t('accountCredit.manualOverrideHint')}
          </Text>
        </View>

        <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.sm }]}>
          {t('accountCredit.upcomingInstallments')}
        </Text>
        <Text style={[typography.styles.caption, {
          color: colors.textTertiary,
          marginBottom: spacing.md,
        }]}>
          {t('accountCredit.upcomingHint')}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : upcoming.length === 0 ? (
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.lg,
            padding: spacing.xl,
          }]}>
            <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t('accountCredit.noInstallments')}
            </Text>
          </View>
        ) : (
          upcoming.map((item, idx) => (
            <View
              key={`${item.transactionId}-${item.installmentNumber}-${idx}`}
              style={[styles.installmentRow, {
                backgroundColor: colors.card,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }]}
            >
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={[typography.styles.titleSmall, { color: colors.text }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={[typography.styles.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {t('accountCredit.installmentOf', {
                    current: item.installmentNumber,
                    total: item.installmentTotal,
                  })}
                  {' · '}
                  {formatDate(item.estimatedDate, 'short')}
                </Text>
              </View>
              <Text style={[typography.styles.titleSmall, { color: colors.expense }]}>
                {formatCurrency(-item.amount)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {},
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center' },
  installmentRow: { flexDirection: 'row', alignItems: 'center' },
});
