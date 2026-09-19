import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme }            from '../../../hooks/useTheme';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore }     from '../../../store/accountStore';
import { ExportService }       from '../../../services/ExportService';
import { TransactionRepository, MONTH_HARD_CAP } from '../../../database/repositories/TransactionRepository';
import { Transaction } from '../../../models/types';
import { formatMonthYear }     from '../../../utils/date';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';

export function ExportScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const currentMonth = useTransactionStore(s => s.currentMonth);
  const accounts     = useAccountStore(s => s.accounts);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exporting, setExporting]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    TransactionRepository.findByMonth(currentMonth.year, currentMonth.month, MONTH_HARD_CAP, 0)
      .then(rows => { if (!cancelled) setTransactions(rows); })
      .catch(() => { if (!cancelled) setTransactions([]); });
    return () => { cancelled = true; };
  }, [currentMonth]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const content = format === 'csv'
        ? ExportService.toCSV(transactions, accounts)
        : ExportService.toJSON(transactions, accounts);

      const month   = new Date(currentMonth.year, currentMonth.month - 1);
      const title   = `FinTrack_${formatMonthYear(month).replace(' ', '_')}.${format}`;

      await Share.share({ title, message: content });
    } catch {
      Alert.alert(t('common.error'), t('export.error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={t('export.title')} onClose={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}>
        <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
          {t('export.description')}
        </Text>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {t('export.availableCount', { count: transactions.length })}
        </Text>

        {[
          { format: 'csv' as const, icon: '📊', title: t('export.exportCsv'), subtitle: t('export.exportCsvSubtitle') },
          { format: 'json' as const, icon: '🔧', title: t('export.exportJson'), subtitle: t('export.exportJsonSubtitle') },
        ].map(opt => (
          <TouchableOpacity
            key={opt.format}
            onPress={() => handleExport(opt.format)}
            disabled={exporting || transactions.length === 0}
            style={[{
              backgroundColor: colors.card,
              borderRadius: borderRadius.xl,
              padding: spacing.base,
              marginBottom: spacing.base,
              flexDirection: 'row',
              alignItems: 'center',
              ...shadows.sm,
              opacity: exporting ? 0.6 : 1,
            }]}
          >
            <Text style={{ fontSize: 28, marginRight: spacing.md }}>{opt.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{opt.title}</Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary }]}>{opt.subtitle}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 18 }}>↗</Text>
          </TouchableOpacity>
        ))}

        {transactions.length === 0 && (
          <Text style={[typography.styles.bodySmall, { color: colors.warning, textAlign: 'center', marginTop: spacing.lg }]}>
            {t('export.noneThisMonth')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
