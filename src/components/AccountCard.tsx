import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme }       from '../hooks/useTheme';
import { Account }        from '../models/types';
import { formatCurrency } from '../utils/currency';
import { hasBalanceDivergence } from '../services/AccountBalanceService';
import { Icon } from './Icon';

interface AccountCardProps {
  account:      Account;
  onPress?:     (a: Account) => void;
  onLongPress?: (a: Account) => void;
  index?:       number;
}

const TYPE_LABELS: Record<string, string> = {
  checking:    'Conta Corrente',
  savings:     'Poupança',
  credit_card: 'Cartão de Crédito',
  investment:  'Investimentos',
  wallet:      'Carteira',
};

export const AccountCard = memo(function AccountCard({
  account, onPress, onLongPress, index = 0,
}: AccountCardProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const isCredit        = account.type === 'credit_card';
  const informed        = account.informedBalance ?? account.balance;
  const calculated      = account.balance;
  const diverges        = hasBalanceDivergence(account);
  const limitUsed       = isCredit && account.limit ? Math.abs(account.balance) / account.limit : 0;
  const limitColor      = limitUsed > 0.85 ? colors.error : limitUsed > 0.65 ? colors.warning : colors.success;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <TouchableOpacity
        onPress={() => onPress?.(account)}
        onLongPress={() => onLongPress?.(account)}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: account.color,
            borderRadius:    borderRadius.xl,
            padding:         spacing.base,
            marginBottom:    spacing.sm,
            shadowColor:     account.color,
            shadowOffset:    { width: 0, height: 4 },
            shadowOpacity:   0.35,
            shadowRadius:    8,
            elevation:       5,
            overflow:        'hidden',
          },
        ]}
      >
        <View style={styles.decorCircle} />

        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon
              name={isCredit ? 'credit-card' : account.type === 'investment' ? 'investment' : 'bank'}
              size={22}
              color="#FFF"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {diverges && (
              <View style={[styles.warnBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Icon name="warning" size={12} color="#FFF" />
              </View>
            )}
            {account.bankName && (
              <View style={[styles.bankBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.9)' }]}>
                  {account.bankName}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[typography.styles.labelSmall, { color: 'rgba(255,255,255,0.8)', marginTop: spacing.sm }]}>
          {TYPE_LABELS[account.type] ?? account.type}
        </Text>
        <Text style={[typography.styles.bodyMedium, { color: '#FFF', fontWeight: '600' }]}>
          {account.name}
        </Text>

        <View style={{ marginTop: spacing.sm }}>
          <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
            Saldo calculado
          </Text>
          <Text style={[typography.styles.titleLarge, { color: '#FFF' }]}>
            {formatCurrency(calculated)}
          </Text>
        </View>

        <View style={[styles.informedRow, { marginTop: spacing.xs }]}>
          <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
            Saldo informado
          </Text>
          <Text style={[typography.styles.labelLarge, {
            color: diverges ? '#FDE68A' : 'rgba(255,255,255,0.95)',
            fontWeight: '600',
          }]}>
            {formatCurrency(informed)}
          </Text>
        </View>

        {isCredit && account.limit && (
          <View style={{ marginTop: spacing.sm }}>
            <View style={[styles.limitBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[
                styles.limitFill,
                { width: `${Math.min(limitUsed * 100, 100)}%`, backgroundColor: limitColor },
              ]} />
            </View>
            <View style={styles.limitRow}>
              <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                Limite utilizado
              </Text>
              <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.9)' }]}>
                {formatCurrency(account.limit)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card:        {},
  decorCircle: {
    position: 'absolute', width: 150, height: 150,
    borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)',
    top: -50, right: -30,
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  bankBadge:  { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  warnBadge:  { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  informedRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitBar:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  limitFill:  { height: '100%', borderRadius: 2 },
  limitRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
