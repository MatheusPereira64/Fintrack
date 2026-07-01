import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const CHART_HEIGHT = 180;
const PADDING = { top: 10, right: 10, bottom: 30, left: 50 };

interface MonthlyTotal {
  year:    number;
  month:   number;
  income:  number;
  expense: number;
}

interface SpendingChartProps {
  data: MonthlyTotal[];
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                     'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const SpendingChart = memo(function SpendingChart({ data }: SpendingChartProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const plotW = CHART_WIDTH - 16 - PADDING.left - PADDING.right;
    const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const maxVal = Math.max(
      ...data.flatMap(d => [d.income, d.expense]),
      1,
    );
    const groupW = plotW / data.length;
    const barW = Math.min(8, groupW * 0.22);
    const gap = 4;

    const bars = data.flatMap((d, i) => {
      const cx = PADDING.left + groupW * i + groupW / 2;
      const incomeH = (d.income / maxVal) * plotH;
      const expenseH = (d.expense / maxVal) * plotH;
      const baseY = PADDING.top + plotH;
      return [
        {
          key: `in-${i}`,
          x: cx - barW - gap / 2,
          y: baseY - incomeH,
          h: incomeH,
          color: colors.income,
        },
        {
          key: `ex-${i}`,
          x: cx + gap / 2,
          y: baseY - expenseH,
          h: expenseH,
          color: colors.expense,
        },
      ];
    });

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
      y: PADDING.top + plotH * (1 - t),
      label: `R$${Math.round((maxVal * t) / 1000)}k`,
    }));

    return { bars, yTicks, plotW, plotH };
  }, [colors.expense, colors.income, data]);

  if (!chart) return null;

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(500)} style={[
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
        Ultimos 6 meses
      </Text>

      <Svg width={CHART_WIDTH - 16} height={CHART_HEIGHT}>
        {chart.yTicks.map((tick, i) => (
          <React.Fragment key={`grid-${i}`}>
            <Line
              x1={PADDING.left}
              y1={tick.y}
              x2={PADDING.left + chart.plotW}
              y2={tick.y}
              stroke={colors.borderLight}
              strokeDasharray="4,4"
            />
            <SvgText
              x={PADDING.left - 6}
              y={tick.y + 4}
              fontSize={9}
              fill={colors.textSecondary}
              textAnchor="end"
            >
              {tick.label}
            </SvgText>
          </React.Fragment>
        ))}

        {data.map((d, i) => {
          const x = PADDING.left + (chart.plotW / data.length) * i + (chart.plotW / data.length) / 2;
          return (
            <SvgText
              key={`lbl-${i}`}
              x={x}
              y={CHART_HEIGHT - 8}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {MONTH_SHORT[d.month - 1]}
            </SvgText>
          );
        })}

        {chart.bars.map(bar => (
          <Rect
            key={bar.key}
            x={bar.x}
            y={bar.y}
            width={8}
            height={Math.max(bar.h, 0)}
            rx={4}
            fill={bar.color}
          />
        ))}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>Receitas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>Despesas</Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {},
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
});
