import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useAccountStore } from '../../../store/accountStore';
import { formatCurrency } from '../../../utils/currency';
import { simulateAccountPlan, PlanResult } from '../../../services/AccountPlanService';
import { AccountNamedPlanService, AccountNamedPlan } from '../../../services/AccountNamedPlanService';
import { CloseButton } from '../../../components/CloseButton';
import { Icon } from '../../../components/Icon';

const HORIZON_PRESETS = [3, 6, 12, 24, 36] as const;
const HORIZON_MIN = 1;
const HORIZON_MAX = 60;
const STORAGE_KEY = (id: number) => `@fintrack/plan/${id}`;

function clampHorizon(n: number): number {
  if (!Number.isFinite(n)) return 6;
  return Math.min(HORIZON_MAX, Math.max(HORIZON_MIN, Math.floor(n)));
}

export function AccountPlanScreen({ route, navigation }: any) {
  const { accountId } = route.params as { accountId: number };
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useSafeBottomPadding(24);
  const account = useAccountStore(s => s.accounts.find(a => a.id === accountId));

  const baseBalance = account?.informedBalance ?? account?.balance ?? 0;

  const [income, setIncome] = useState('');
  const [expense, setExpense] = useState('');
  const [yieldRate, setYieldRate] = useState('0,5');
  const [months, setMonths] = useState<number>(6);
  const [customHorizon, setCustomHorizon] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [savedPlans, setSavedPlans] = useState<AccountNamedPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSavedPlans = useCallback(async () => {
    if (!account) return;
    const plans = await AccountNamedPlanService.getPlansByAccount(account.id);
    setSavedPlans(plans);
  }, [account]);

  useEffect(() => {
    loadSavedPlans();
  }, [loadSavedPlans]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      // Migrate legacy plan if exists
      await AccountNamedPlanService.migrateLegacyPlan(account.id, t('accountPlan.defaultPlanName'));
      await loadSavedPlans();
      
      // Try to load from legacy storage for current session
      const raw = await AsyncStorage.getItem(STORAGE_KEY(account.id));
      if (cancelled) return;
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.income != null) setIncome(String(saved.income).replace('.', ','));
          if (saved.expense != null) setExpense(String(saved.expense).replace('.', ','));
          if (saved.yieldRate != null) {
            setYieldRate(String(saved.yieldRate).replace('.', ','));
          } else if (account.monthlyYieldRate != null) {
            setYieldRate(String(account.monthlyYieldRate).replace('.', ','));
          }
          if (saved.months) {
            const h = clampHorizon(Number(saved.months));
            setMonths(h);
            if (!(HORIZON_PRESETS as readonly number[]).includes(h)) {
              setCustomHorizon(String(h));
            }
          }
        } catch { /* ignore */ }
      } else if (account.monthlyYieldRate != null) {
        setYieldRate(String(account.monthlyYieldRate).replace('.', ','));
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
    // Recarrega só quando a conta muda, não a cada campo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  const parse = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;

  const result: PlanResult = useMemo(() => simulateAccountPlan({
    startingBalance: baseBalance,
    monthlyIncome: parse(income),
    monthlyExpense: parse(expense),
    monthlyYieldRate: parse(yieldRate),
    months,
  }), [baseBalance, income, expense, yieldRate, months]);

  const handleSavePlan = useCallback(async () => {
    if (!account || !planName.trim()) {
      Alert.alert(t('common.warning'), t('accountPlan.planNameRequired'));
      return;
    }
    setSaving(true);
    try {
      if (currentPlanId) {
        await AccountNamedPlanService.updatePlan(currentPlanId, {
          name: planName.trim(),
          income: parse(income),
          expense: parse(expense),
          yieldRate: parse(yieldRate),
          months,
        });
      } else {
        const newPlan = await AccountNamedPlanService.savePlan({
          accountId: account.id,
          name: planName.trim(),
          income: parse(income),
          expense: parse(expense),
          yieldRate: parse(yieldRate),
          months,
        });
        setCurrentPlanId(newPlan.id);
      }
      await loadSavedPlans();
      setShowSaveModal(false);
      setPlanName('');
      Alert.alert(t('common.success'), t('accountPlan.planSaved'));
    } catch {
      Alert.alert(t('common.error'), t('accountPlan.planSaveError'));
    } finally {
      setSaving(false);
    }
  }, [account, planName, currentPlanId, income, expense, yieldRate, months, loadSavedPlans, t]);

  const handleLoadPlan = useCallback((plan: AccountNamedPlan) => {
    setIncome(String(plan.income).replace('.', ','));
    setExpense(String(plan.expense).replace('.', ','));
    setYieldRate(String(plan.yieldRate).replace('.', ','));
    setMonths(plan.months);
    setCurrentPlanId(plan.id);
    if (!(HORIZON_PRESETS as readonly number[]).includes(plan.months)) {
      setCustomHorizon(String(plan.months));
    } else {
      setCustomHorizon('');
    }
    setShowPlansModal(false);
  }, []);

  const handleDeletePlan = useCallback(async (plan: AccountNamedPlan) => {
    Alert.alert(
      t('accountPlan.deletePlanTitle'),
      t('accountPlan.deletePlanMessage', { name: plan.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await AccountNamedPlanService.deletePlan(plan.id);
            if (currentPlanId === plan.id) {
              setCurrentPlanId(null);
            }
            await loadSavedPlans();
          },
        },
      ],
    );
  }, [currentPlanId, loadSavedPlans, t]);

  const handleNewPlan = useCallback(() => {
    setCurrentPlanId(null);
    setIncome('');
    setExpense('');
    setYieldRate(account?.monthlyYieldRate != null ? String(account.monthlyYieldRate).replace('.', ',') : '0,5');
    setMonths(6);
    setCustomHorizon('');
  }, [account]);

  useEffect(() => {
    if (!account || !hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY(account.id), JSON.stringify({
      income: parse(income),
      expense: parse(expense),
      yieldRate: parse(yieldRate),
      months,
    }));
    // `account` é lido via account.id já coberto acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, income, expense, yieldRate, months, hydrated]);

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>{t('accountPlan.accountNotFound')}</Text>
      </View>
    );
  }

  const chartW = 280;
  const chartH = 100;
  const balances = result.months.map(m => m.balance);
  const minB = Math.min(...balances, baseBalance);
  const maxB = Math.max(...balances, baseBalance);
  const range = maxB - minB || 1;
  const points = result.months.map((m, i) => {
    const x = (i / Math.max(result.months.length - 1, 1)) * (chartW - 16) + 8;
    const y = chartH - 8 - ((m.balance - minB) / range) * (chartH - 16);
    return `${x},${y}`;
  }).join(' ');

  const isPresetHorizon = (HORIZON_PRESETS as readonly number[]).includes(months);
  const chartDotStep = months > 18 ? 3 : months > 12 ? 2 : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('accountPlan.title')}
        subtitle={account.name}
        onClose={() => navigation.goBack()}
        actions={[
          {
            icon: 'goal',
            onPress: () => setShowPlansModal(true),
            color: colors.primary,
          },
          {
            icon: 'add',
            onPress: () => handleNewPlan(),
            color: colors.primary,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          marginBottom: spacing.base,
        }]}>
          <Text style={[typography.styles.labelMedium, { color: colors.textSecondary }]}>
            {t('accountPlan.baseBalance')}
          </Text>
          <Text style={[typography.styles.titleLarge, { color: colors.text, marginTop: 4 }]}>
            {formatCurrency(baseBalance)}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            {t('accountPlan.localSimulation')}
          </Text>
        </View>

        {currentPlanId && savedPlans.find(p => p.id === currentPlanId) && (
          <View style={[{
            backgroundColor: colors.card,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginBottom: spacing.base,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                {t('accountPlan.currentPlan')}
              </Text>
              <Text style={[typography.styles.labelLarge, { color: colors.text }]}>
                {savedPlans.find(p => p.id === currentPlanId)?.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPlanName(savedPlans.find(p => p.id === currentPlanId)?.name || '');
                setShowSaveModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            const currentPlan = savedPlans.find(p => p.id === currentPlanId);
            setPlanName(currentPlan?.name || '');
            setShowSaveModal(true);
          }}
          style={[{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.full,
            padding: spacing.md,
            marginBottom: spacing.base,
            alignItems: 'center',
          }]}
        >
          <Text style={[typography.styles.labelLarge, { color: '#FFF' }]}>
            {currentPlanId ? t('accountPlan.updatePlan') : t('accountPlan.savePlan')}
          </Text>
        </TouchableOpacity>

        <PlanMoneyField label={t('accountPlan.monthlyIncome')} value={income} onChange={setIncome} />
        <PlanMoneyField label={t('accountPlan.monthlyExpense')} value={expense} onChange={setExpense} />
        <PlanMoneyField
          label={t('accountPlan.yieldRate')}
          value={yieldRate}
          onChange={setYieldRate}
          hint={
            account.monthlyYieldRate != null
              ? t('accountPlan.accountYieldRate', { rate: String(account.monthlyYieldRate).replace('.', ',') })
              : t('accountPlan.yieldHint')
          }
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('accountPlan.horizon')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }}>
          {HORIZON_PRESETS.map(h => {
            const sel = months === h && customHorizon.trim() === '';
            return (
              <TouchableOpacity
                key={h}
                onPress={() => { setCustomHorizon(''); setMonths(h); }}
                style={{
                  minWidth: '18%',
                  flexGrow: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: borderRadius.lg,
                  backgroundColor: sel ? colors.primary : colors.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.styles.labelLarge, { color: sel ? '#FFF' : colors.textSecondary }]}>
                  {h}m
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>
          {t('accountPlan.horizonCustom', { max: HORIZON_MAX })}
        </Text>
        <TextInput
          value={isPresetHorizon && customHorizon === '' ? String(months) : customHorizon}
          onChangeText={text => {
            const digits = text.replace(/[^\d]/g, '').slice(0, 2);
            setCustomHorizon(digits);
            if (digits === '') return;
            setMonths(clampHorizon(parseInt(digits, 10)));
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder={t('accountPlan.horizonPlaceholder')}
          placeholderTextColor={colors.placeholder}
          style={[{
            backgroundColor: colors.inputBackground,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            color: colors.inputText,
            marginBottom: spacing.xl,
          }, typography.styles.bodyMedium]}
        />

        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          marginBottom: spacing.base,
        }]}>
          <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.md }]}>
            {t('accountPlan.projection')}
          </Text>
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Svg width={chartW} height={chartH}>
              <Polyline
                points={points}
                fill="none"
                stroke={result.profitOrLoss >= 0 ? colors.success : colors.error}
                strokeWidth={2.5}
              />
              {result.months.map((m, i) => {
                if (i % chartDotStep !== 0 && i !== result.months.length - 1) return null;
                const x = (i / Math.max(result.months.length - 1, 1)) * (chartW - 16) + 8;
                const y = chartH - 8 - ((m.balance - minB) / range) * (chartH - 16);
                return (
                  <Circle
                    key={m.month}
                    cx={x}
                    cy={y}
                    r={3}
                    fill={result.profitOrLoss >= 0 ? colors.success : colors.error}
                  />
                );
              })}
            </Svg>
          </View>

          <Metric label={t('accountPlan.finalBalance')} value={formatCurrency(result.finalBalance)} color={colors.text} />
          <Metric
            label={result.profitOrLoss >= 0 ? t('accountPlan.profit') : t('accountPlan.loss')}
            value={formatCurrency(Math.abs(result.profitOrLoss))}
            color={result.profitOrLoss >= 0 ? colors.success : colors.error}
          />
          <Metric label={t('accountPlan.totalIncome')} value={formatCurrency(result.totalIncome)} color={colors.income} />
          <Metric label={t('accountPlan.totalExpense')} value={formatCurrency(result.totalExpense)} color={colors.expense} />
          <Metric label={t('accountPlan.totalYield')} value={formatCurrency(result.totalYield)} color={colors.primary} />
        </View>

        <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.sm }]}>
          {t('accountPlan.monthByMonth')}
        </Text>
        {result.months.map(m => (
          <View
            key={m.month}
            style={[styles.row, {
              backgroundColor: colors.card,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.xs,
            }]}
          >
            <Text style={[typography.styles.labelLarge, { color: colors.text }]}>{t('accountPlan.month', { number: m.month })}</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
              {formatCurrency(m.balance)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Modal para salvar/atualizar plano */}
      <Modal visible={showSaveModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowSaveModal(false); setPlanName(''); }}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              paddingTop: spacing.xl,
              paddingHorizontal: spacing.xl,
              paddingBottom: Math.max(insets.bottom, 16),
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
                {currentPlanId ? t('accountPlan.updatePlan') : t('accountPlan.savePlan')}
              </Text>
              <CloseButton onPress={() => { setShowSaveModal(false); setPlanName(''); }} />
            </View>

            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('accountPlan.planName')}
            </Text>
            <TextInput
              value={planName}
              onChangeText={setPlanName}
              placeholder={t('accountPlan.planNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
              style={[{
                backgroundColor: colors.inputBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                color: colors.inputText,
                marginBottom: spacing.lg,
              }, typography.styles.bodyMedium]}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => { setShowSaveModal(false); setPlanName(''); }}
                style={[styles.btn, { backgroundColor: colors.surfaceVariant, flex: 1, borderRadius: borderRadius.full }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePlan}
                disabled={saving}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1, borderRadius: borderRadius.full }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  {saving ? '...' : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal para listar planos salvos */}
      <Modal visible={showPlansModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPlansModal(false)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              paddingTop: spacing.xl,
              paddingHorizontal: spacing.xl,
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: '80%',
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
                {t('accountPlan.savedPlans')}
              </Text>
              <CloseButton onPress={() => setShowPlansModal(false)} />
            </View>

            {savedPlans.length === 0 ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Icon name="goal" size={48} color={colors.textTertiary} />
                <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }]}>
                  {t('accountPlan.noPlans')}{'\n'}{t('accountPlan.noPlansHint')}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {savedPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => handleLoadPlan(plan)}
                    onLongPress={() => handleDeletePlan(plan)}
                    style={[{
                      backgroundColor: currentPlanId === plan.id ? colors.surfaceVariant : colors.background,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                      marginBottom: spacing.xs,
                      borderLeftWidth: 3,
                      borderLeftColor: currentPlanId === plan.id ? colors.primary : 'transparent',
                    }]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.styles.labelLarge, { color: colors.text }]}>
                          {plan.name}
                        </Text>
                        <Text style={[typography.styles.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {t('accountPlan.planDetails', {
                            months: plan.months,
                            income: formatCurrency(plan.income),
                            expense: formatCurrency(plan.expense),
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeletePlan(plan)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="delete" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: spacing.sm, textAlign: 'center' }]}>
                  {t('accountPlan.planActions')}
                </Text>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function PlanMoneyField({
  label, value, onChange, hint,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={text => onChange(text.replace(/[^\d,.]/g, ''))}
        keyboardType="decimal-pad"
        maxLength={15}
        placeholder={t('common.amountPlaceholder')}
        placeholderTextColor={colors.placeholder}
        style={[{
          backgroundColor: colors.inputBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          color: colors.inputText,
        }, typography.styles.bodyMedium]}
      />
      {hint ? (
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const { typography, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={[typography.styles.bodyMedium, { color }]}>{label}</Text>
      <Text style={[typography.styles.titleSmall, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {},
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  btn: { padding: 12 },
});
