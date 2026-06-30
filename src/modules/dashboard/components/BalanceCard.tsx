import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, FadeInDown,
} from 'react-native-reanimated';
import { useTheme }     from '../../../hooks/useTheme';
import { AnimatedNumber } from '../../../components/AnimatedNumber';
import { formatCurrency } from '../../../utils/currency';
import { formatMonthYear, subtractMonths, addMonths } from '../../../utils/date';

const { width } = Dimensions.get('window');

interface BalanceCardProps {
  totalBalance: number;
  income:       number;
  expense:      number;
  count:        number;
  currentDate:  Date;
  onPrevMonth:  () => void;
  onNextMonth:  () => void;
}

export const BalanceCard = memo(function BalanceCard({
  totalBalance, income, expense, count, currentDate, onPrevMonth, onNextMonth,
}: BalanceCardProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withSpring(1, { damping: 12, stiffness: 150 });
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  const balance = income - expense;
  const isPositive = balance >= 0;

  return (
    <Animated.View entering={FadeInDown.duration(500).springify()} style={animStyle}>
      <View style={[
        styles.card,
        {
          backgroundColor: colors.primary,
          borderRadius:     borderRadius['2xl'],
          marginHorizontal: spacing.base,
          padding:          spacing.xl,
        },
      ]}>
        {/* Decoração de fundo */}
        <View style={[styles.circle1, { borderColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.circle2, { borderColor: 'rgba(255,255,255,0.07)' }]} />

        {/* Seletor de mês */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={onPrevMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={[typography.styles.labelLarge, styles.monthText]}>
            {formatMonthYear(currentDate)}
          </Text>
          <TouchableOpacity onPress={onNextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Saldo total em contas */}
        <Text style={[typography.styles.labelMedium, styles.label]}>
          Patrimônio total
        </Text>
        <AnimatedNumber
          value={totalBalance}
          style={[typography.styles.displaySmall, styles.totalBalance]}
          duration={600}
        />

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />

        {/* Receita / Despesa / Saldo */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricIcon}>📥</Text>
            <AnimatedNumber value={income} style={[typography.styles.titleSmall, styles.incomeText]} duration={700} />
            <Text style={styles.metricLabel}>Receitas</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.metric}>
            <Text style={styles.metricIcon}>📤</Text>
            <AnimatedNumber value={expense} style={[typography.styles.titleSmall, styles.expenseText]} duration={700} />
            <Text style={styles.metricLabel}>Despesas</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.metric}>
            <Text style={styles.metricIcon}>{isPositive ? '📈' : '📉'}</Text>
            <AnimatedNumber
              value={Math.abs(balance)}
              style={[typography.styles.titleSmall, isPositive ? styles.incomeText : styles.expenseText]}
              duration={700}
            />
            <Text style={styles.metricLabel}>Saldo</Text>
          </View>
        </View>

        {/* Contador de transações */}
        <View style={[styles.countBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.countText}>
            {count} transaç{count === 1 ? 'ão' : 'ões'} no mês
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  circle1: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, borderWidth: 40,
    top: -80, right: -60,
  },
  circle2: {
    position: 'absolute', width: 140, height: 140,
    borderRadius: 70, borderWidth: 30,
    bottom: -40, left: -40,
  },
  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16, marginBottom: 8,
  },
  arrow:       { color: 'rgba(255,255,255,0.8)', fontSize: 24, fontWeight: '300' },
  monthText:   { color: 'rgba(255,255,255,0.9)' },
  label:       { color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  totalBalance: { color: '#FFFFFF', marginBottom: 16 },
  divider:     { height: 1, marginBottom: 16 },
  metricsRow:  { flexDirection: 'row', alignItems: 'center' },
  metric:      { flex: 1, alignItems: 'center', gap: 2 },
  metricIcon:  { fontSize: 16 },
  metricDivider: { width: 1, height: 40 },
  metricLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  incomeText:  { color: '#86EFAC' },
  expenseText: { color: '#FCA5A5' },
  countBadge:  { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'center', marginTop: 12 },
  countText:   { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});
