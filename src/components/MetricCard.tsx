import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme }      from '../hooks/useTheme';
import { AnimatedNumber } from './AnimatedNumber';
import { formatCurrency } from '../utils/currency';

type MetricVariant = 'default' | 'income' | 'expense' | 'primary';

interface MetricCardProps {
  title:    string;
  value:    number;
  icon?:    string;
  subtitle?: string;
  variant?: MetricVariant;
  onPress?: () => void;
  index?:   number;
}

export const MetricCard = memo(function MetricCard({
  title, value, icon, subtitle, variant = 'default', onPress, index = 0,
}: MetricCardProps) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

  const variantStyles: Record<MetricVariant, { bg: string; text: string; val: string }> = {
    default: {
      bg:   colors.card,
      text: colors.textSecondary,
      val:  colors.text,
    },
    income: {
      bg:   colors.incomeBackground,
      text: colors.income,
      val:  colors.income,
    },
    expense: {
      bg:   colors.expenseBackground,
      text: colors.expense,
      val:  colors.expense,
    },
    primary: {
      bg:   colors.primaryLight,
      text: colors.primary,
      val:  colors.primary,
    },
  };

  const vs = variantStyles[variant];

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(350)}>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: vs.bg,
            borderRadius:     borderRadius.xl,
            padding:          spacing.base,
            ...shadows.sm,
          },
        ]}
      >
        <View style={styles.row}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: `${vs.val}15`, borderRadius: borderRadius.md }]}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
          )}
          <Text style={[typography.styles.bodyMedium, { color: vs.text, flex: 1 }]}>{title}</Text>
        </View>
        <AnimatedNumber
          value={value}
          style={[typography.styles.titleLarge, { color: vs.val, marginTop: spacing.xs }]}
          duration={600}
        />
        {subtitle && (
          <Text style={[typography.styles.caption, { color: vs.text, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card:    {},
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  iconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});
