import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { InsightService }      from '../../../services/InsightService';
import { Insight }             from '../../../models/types';
import { formatDate }          from '../../../utils/date';

const SEVERITY_COLORS: Record<string, string> = {
  info:     '#3B82F6',
  warning:  '#EAB308',
  critical: '#EF4444',
};

const SEVERITY_ICONS: Record<string, string> = {
  info:     'ℹ️',
  warning:  '⚠️',
  critical: '🚨',
};

export function InsightsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const generated = await InsightService.generateAndSave();
        if (active) setInsights(generated);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />

      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Math.max(insets.top, 20), paddingHorizontal: spacing.base, paddingBottom: spacing.base, ...shadows.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[typography.styles.titleLarge, { color: colors.text }]}>Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : insights.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl, padding: spacing.xl }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>📊</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
              Sem insights ainda
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Os insights aparecem conforme suas transações são registradas.
            </Text>
          </View>
        ) : insights.map((insight, idx) => {
          const badgeColor = SEVERITY_COLORS[insight.severity] ?? colors.primary;
          const icon       = SEVERITY_ICONS[insight.severity] ?? 'ℹ️';

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
                <Text style={{ fontSize: 20 }}>{icon}</Text>
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
                      {insight.severity}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center' },
  insightHeader: { flexDirection: 'row', alignItems: 'flex-start' },
});
