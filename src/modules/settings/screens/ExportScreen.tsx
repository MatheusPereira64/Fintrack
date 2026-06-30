import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, Alert, Share,
} from 'react-native';
import { useTheme }            from '../../../hooks/useTheme';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore }     from '../../../store/accountStore';
import { ExportService }       from '../../../services/ExportService';
import { formatMonthYear }     from '../../../utils/date';

export function ExportScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { transactions, currentMonth } = useTransactionStore();
  const { accounts }                    = useAccountStore();
  const [exporting, setExporting]       = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const content = format === 'csv'
        ? ExportService.toCSV(transactions, accounts)
        : ExportService.toJSON(transactions, accounts);

      const month   = new Date(currentMonth.year, currentMonth.month - 1);
      const title   = `FinTrack_${formatMonthYear(month).replace(' ', '_')}.${format}`;

      await Share.share({ title, message: content });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />

      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS === 'android' ? 48 : 56, paddingHorizontal: spacing.base, paddingBottom: spacing.base, ...shadows.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[typography.styles.titleLarge, { color: colors.text }]}>Exportar dados</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
          Exporte suas transações para análise em planilhas ou outros apps.
        </Text>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
          {transactions.length} transações disponíveis
        </Text>

        {[
          { format: 'csv' as const, icon: '📊', title: 'Exportar CSV', subtitle: 'Compatível com Excel, Google Sheets' },
          { format: 'json' as const, icon: '🔧', title: 'Exportar JSON', subtitle: 'Para desenvolvedores e apps' },
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
            Nenhuma transação para exportar neste mês.
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
