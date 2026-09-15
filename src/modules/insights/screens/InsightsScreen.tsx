import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Icon, AppIconName } from '../../../components/Icon';
import { AppHeader } from '../../../components/AppHeader';
import { InsightService } from '../../../services/InsightService';
import { Insight } from '../../../models/types';
import { formatDate } from '../../../utils/date';
import { FinanceSnapshotCard } from '../../dashboard/components/FinanceSnapshotCard';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';

const SEVERITY_COLORS: Record<string, string> = {
  info:     '#3B82F6',
  warning:  '#EAB308',
  critical: '#EF4444',
};

const SEVERITY_ICONS: Record<string, AppIconName> = {
  info:     'info',
  warning:  'warning',
  critical: 'error',
};

const SEVERITY_LABELS: Record<string, string> = {
  info:     'Dica',
  warning:  'Atenção',
  critical: 'Urgente',
};

export function InsightsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading]   = useState(true);
  const [snapKey, setSnapKey]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const generated = await InsightService.generateAndSave();
      setInsights(generated);
      setSnapKey(k => k + 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Insights" onClose={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <FinanceSnapshotCard refreshKey={snapKey} />

        <Text style={[typography.styles.titleSmall, {
          color: colors.text,
          marginTop: spacing.xl,
          marginBottom: spacing.md,
        }]}>
          Sugestões
        </Text>

        {loading && insights.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : insights.length === 0 ? (
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }]}>
            <Icon name="chart-bar" size={40} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
              Sem insights ainda
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Registre transações e atualize o saldo das contas para receber médias, projeções e sugestões.
            </Text>
          </View>
        ) : insights.map((insight, idx) => {
          const badgeColor = SEVERITY_COLORS[insight.severity] ?? colors.primary;
          const icon       = SEVERITY_ICONS[insight.severity] ?? 'info';

          return (
            <View key={idx} style={[{
              backgroundColor: colors.card,
              borderRadius: borderRadius.xl,
              padding: spacing.base,
              marginBottom: spacing.base,
              borderLeftWidth: 4,
              borderLeftColor: badgeColor,
              ...shadows.sm,
            }]}>
              <View style={styles.insightHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${badgeColor}18` }]}>
                  <Icon name={icon} size={18} color={badgeColor} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
                    {insight.title}
                  </Text>
                  <View style={[{
                    backgroundColor: `${badgeColor}20`,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                  }]}>
                    <Text style={[typography.styles.caption, { color: badgeColor }]}>
                      {SEVERITY_LABELS[insight.severity] ?? insight.severity}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {insight.description}
              </Text>
              <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                {formatDate(insight.createdAt, 'medium')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center' },
  insightHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
