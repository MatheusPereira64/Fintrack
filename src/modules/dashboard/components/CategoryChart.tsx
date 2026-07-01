import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { formatCurrency, formatPercent } from '../../../utils/currency';

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

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(
  cx: number, cy: number, r: number, startAngle: number, endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export const CategoryChart = memo(function CategoryChart({ data }: CategoryChartProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const pie = useMemo(() => {
    if (data.length === 0) return null;

    const total = data.reduce((s, c) => s + c.total, 0);
    const top5 = data.slice(0, 5);
    const others = data.slice(5).reduce((s, c) => s + c.total, 0);
    const slices = [
      ...top5.map(c => ({ label: c.name, value: c.total, color: c.color })),
      ...(others > 0 ? [{ label: 'Outros', value: others, color: colors.textTertiary }] : []),
    ];

    const cx = 80;
    const cy = 80;
    const r = 72;
    let angle = 0;

    const paths = slices.map((slice, i) => {
      const sweep = total > 0 ? (slice.value / total) * 360 : 0;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return {
        key: `slice-${i}`,
        d: describeSlice(cx, cy, r, start, end),
        color: slice.color,
      };
    });

    return { paths, total, top5, others };
  }, [colors.textTertiary, data]);

  if (!pie) return null;

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
        <Svg width={160} height={160}>
          <G>
            {pie.paths.map(slice => (
              <Path key={slice.key} d={slice.d} fill={slice.color} />
            ))}
          </G>
        </Svg>

        <View style={styles.list}>
          {pie.top5.map(cat => {
            const pct = (cat.total / pie.total) * 100;
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
          {pie.others > 0 && (
            <View style={styles.listItem}>
              <View style={[styles.colorDot, { backgroundColor: colors.textTertiary }]} />
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                Outros · {formatCurrency(pie.others)}
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
