import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme }       from '../hooks/useTheme';
import { Account }        from '../models/types';
import { formatCurrency } from '../utils/currency';
import { hasBalanceDivergence } from '../services/AccountBalanceService';
import {
  accountSupportsYield,
  estimateMonthlyYield,
} from '../services/AccountPlanService';
import {
  getAccountInvoiceCycle,
  resolveLimitUsageRatio,
  resolveUsedLimit,
} from '../services/CreditCardCycleService';
import { Icon } from './Icon';

interface AccountCardProps {
  account:      Account;
  onPress?:     (a: Account) => void;
  onLongPress?: (a: Account) => void;
  onPlan?:      (a: Account) => void;
  onCredit?:    (a: Account) => void;
  index?:       number;
}

const TYPE_I18N_KEYS: Record<string, string> = {
  checking:    'checking',
  savings:     'savings',
  credit_card: 'creditCard',
  investment:  'investment',
  wallet:      'wallet',
};

export const AccountCard = memo(function AccountCard({
  account, onPress, onLongPress, onPlan, onCredit, index = 0,
}: AccountCardProps) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();

  const isCredit        = account.type === 'credit_card';
  const informed        = account.informedBalance ?? account.balance;
  const calculated      = account.balance;
  const diverges        = hasBalanceDivergence(account);
  const usedLimit       = isCredit ? resolveUsedLimit(account) : 0;
  const limitUsed       = isCredit ? resolveLimitUsageRatio(account) : 0;
  const limitColor      = limitUsed > 0.85 ? colors.error : limitUsed > 0.65 ? colors.warning : colors.success;
  const yieldRate       = account.monthlyYieldRate ?? 0;
  const showYield       = accountSupportsYield(account.type) && yieldRate > 0;
  const monthlyYield    = showYield ? estimateMonthlyYield(informed, yieldRate) : 0;
  const cycle           = isCredit ? getAccountInvoiceCycle(account) : null;
  const invoiceAmount   = account.invoiceAmount;

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
          {TYPE_I18N_KEYS[account.type]
            ? t(`accountCard.types.${TYPE_I18N_KEYS[account.type]}`)
            : account.type}
        </Text>
        <Text style={[typography.styles.bodyMedium, { color: '#FFF', fontWeight: '600' }]}>
          {account.name}
        </Text>

        <View style={{ marginTop: spacing.sm }}>
          <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
            {t('accountCard.calculatedBalance')}
          </Text>
          <Text style={[typography.styles.titleLarge, { color: '#FFF' }]}>
            {formatCurrency(calculated)}
          </Text>
        </View>

        <View style={[styles.informedRow, { marginTop: spacing.xs }]}>
          <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
            {t('accountCard.informedBalance')}
          </Text>
          <Text style={[typography.styles.labelLarge, {
            color: diverges ? '#FDE68A' : 'rgba(255,255,255,0.95)',
            fontWeight: '600',
          }]}>
            {formatCurrency(informed)}
          </Text>
        </View>

        {isCredit && invoiceAmount != null && (
          <View style={[styles.informedRow, { marginTop: spacing.xs }]}>
            <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
              {t('accountCard.currentInvoice')}
            </Text>
            <Text style={[typography.styles.labelLarge, { color: '#FFF', fontWeight: '600' }]}>
              {formatCurrency(invoiceAmount)}
            </Text>
          </View>
        )}

        {isCredit && cycle && cycle.status !== 'unknown' && (
          <View style={[styles.informedRow, { marginTop: spacing.xs }]}>
            <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
              {t('accountCard.cycleLabel')}
            </Text>
            <Text style={[typography.styles.labelLarge, {
              color: cycle.status === 'overdue' ? '#FECACA'
                : cycle.status === 'closed' ? '#FDE68A'
                : '#BBF7D0',
              fontWeight: '600',
            }]}>
              {t(`accountCard.cycle.${cycle.status}`)}
            </Text>
          </View>
        )}

        {showYield && (
          <View style={[styles.informedRow, { marginTop: spacing.xs }]}>
            <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.75)' }]}>
              {t('accountCard.yieldRate', { rate: String(yieldRate).replace('.', ',') })}
            </Text>
            <Text style={[typography.styles.labelLarge, {
              color: '#BBF7D0',
              fontWeight: '600',
            }]}>
              {t('accountCard.yieldMonth', { amount: formatCurrency(monthlyYield) })}
            </Text>
          </View>
        )}

        {onPlan && accountSupportsYield(account.type) && (
          <TouchableOpacity
            onPress={() => onPlan(account)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.planBtn, {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: borderRadius.full,
              marginTop: spacing.md,
            }]}
          >
            <Icon name="chart-line" size={14} color="#FFF" />
            <Text style={[typography.styles.labelSmall, { color: '#FFF', marginLeft: 6 }]}>
              {t('accountCard.plan')}
            </Text>
          </TouchableOpacity>
        )}

        {isCredit && onCredit && (
          <TouchableOpacity
            onPress={() => onCredit(account)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.planBtn, {
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: borderRadius.full,
              marginTop: spacing.md,
            }]}
          >
            <Icon name="credit-card" size={14} color="#FFF" />
            <Text style={[typography.styles.labelSmall, { color: '#FFF', marginLeft: 6 }]}>
              {t('accountCard.invoiceAndInstallments')}
            </Text>
          </TouchableOpacity>
        )}

        {isCredit && account.limit != null && account.limit > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            <View style={[styles.limitBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <View style={[
                styles.limitFill,
                { width: `${Math.min(limitUsed * 100, 100)}%`, backgroundColor: limitColor },
              ]} />
            </View>
            <View style={styles.limitRow}>
              <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                {t('accountCard.limitUsedOf', {
                  used: formatCurrency(usedLimit),
                  total: formatCurrency(account.limit),
                })}
              </Text>
              <Text style={[typography.styles.caption, { color: 'rgba(255,255,255,0.9)' }]}>
                {`${Math.round(limitUsed * 100)}%`}
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
  planBtn:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 },
  limitBar:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  limitFill:  { height: '100%', borderRadius: 2 },
  limitRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
