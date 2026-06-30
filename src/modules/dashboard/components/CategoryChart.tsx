import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { VictoryPie } from 'victory-native';
import { useTheme } from '../../../hooks/useTheme';
import { formatCurrency, formatPercent } from '../../../utils/currency';

const { width } = Dimensions.get('window');

interface CategoryItem {
  categoryId: number;
  name:       string;
  total:      number;
  color:      string;
  icon:       string;
}

interface CategoryChartProps {
  data: CategoryItem[];
}

export const CategoryChart = memo(function CategoryChart({ data }: CategoryChartProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  if (data.length === 0) return null;

  const total   = data.reduce((s, c) => s + c.total, 0);
  const top5    = data.slice(0, 5);
  const others  = data.slice(5).reduce((s, c) => s + c.total, 0);

  const pieData = [
    ...top5.map(c => ({ x: c.name, y: c.total, color: c.color })),
    ...(others > 0 ? [{ x: 'Outros', y: others, color: colors.textTertiary }] : []),
  ];

  return (
    <Animated.View entering={FadeInUp.delay(300).duration(500)} style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderRadius:     borderRadius.xl,
        marginHorizontal: spacing.base,
        padding:          spacing.base,
        shadowColor:      '#000',
        shadowOffset:     { width: 0, height: 2 },
        shadowOpacity:    0.08,
        shadowRadius:     8,
        elevation:        3,
      },
    ]}>
      <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.sm }]}>
        Gastos por categoria
      </Text>

      <View style={styles.row}>
        {/* Gráfico de pizza */}
        <VictoryPie
          data={pieData}
          x="x" y="y"
          width={160} height={160}
          innerRadius={45}
          colorScale={pieData.map(d => d.color)}
          labels={() => null}
          padding={8}
        />

        {/* Lista de categorias */}
        <View style={styles.list}>
          {top5.map((cat, idx) => {
            const pct = (cat.total / total) * 100;
            return (
              <View key={cat.categoryId} style={[styles.listItem, { marginBottom: 6 }]}>
                <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[typography.styles.labelSmall, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {cat.icon} {cat.name}
                  </Text>
                  <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                    {formatPercent(pct)} · {formatCurrency(cat.total)}
                  </Text>
                </View>
              </View>
            );
          })}
          {others > 0 && (
            <View style={styles.listItem}>
              <View style={[styles.colorDot, { backgroundColor: colors.textTertiary }]} />
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                Outros · {formatCurrency(others)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {},
  row:       { flexDirection: 'row', alignItems: 'center' },
  list:      { flex: 1, paddingLeft: 8 },
  listItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorDot:  { width: 8, height: 8, borderRadius: 4 },
});
