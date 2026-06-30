import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  VictoryBar, VictoryChart, VictoryAxis, VictoryGroup,
  VictoryTheme, VictoryTooltip,
} from 'victory-native';
import { useTheme } from '../../../hooks/useTheme';
import { formatCurrency } from '../../../utils/currency';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;

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
  const { colors, spacing, borderRadius, typography, isDark } = useTheme();

  if (data.length === 0) return null;

  const incomeData  = data.map((d, i) => ({ x: i + 1, y: d.income,  label: MONTH_SHORT[d.month - 1] }));
  const expenseData = data.map((d, i) => ({ x: i + 1, y: d.expense, label: MONTH_SHORT[d.month - 1] }));
  const labels      = data.map(d => MONTH_SHORT[d.month - 1]);

  const maxVal = Math.max(
    ...data.map(d => d.income),
    ...data.map(d => d.expense),
    1,
  );

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
        Últimos 6 meses
      </Text>

      <VictoryChart
        width={CHART_WIDTH - 16}
        height={180}
        domainPadding={{ x: 20 }}
        padding={{ top: 10, bottom: 30, left: 50, right: 10 }}
      >
        <VictoryAxis
          tickValues={data.map((_, i) => i + 1)}
          tickFormat={i => labels[i - 1] ?? ''}
          style={{
            axis:     { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 10 },
            grid:     { stroke: 'transparent' },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={v => `R$${(v / 1000).toFixed(0)}k`}
          style={{
            axis:     { stroke: colors.border },
            tickLabels: { fill: colors.textSecondary, fontSize: 9 },
            grid:     { stroke: colors.borderLight, strokeDasharray: '4,4' },
          }}
        />
        <VictoryGroup offset={10}>
          <VictoryBar
            data={incomeData}
            x="x" y="y"
            style={{ data: { fill: colors.income, borderRadius: 4, rx: 4, ry: 4 } }}
            cornerRadius={{ top: 4 }}
            barWidth={8}
          />
          <VictoryBar
            data={expenseData}
            x="x" y="y"
            style={{ data: { fill: colors.expense, borderRadius: 4, rx: 4, ry: 4 } }}
            cornerRadius={{ top: 4 }}
            barWidth={8}
          />
        </VictoryGroup>
      </VictoryChart>

      {/* Legenda */}
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
