import React, { useEffect, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useTranslation }  from 'react-i18next';
import { useTheme }        from '../../../hooks/useTheme';
import { useAccountStore } from '../../../store/accountStore';
import { AccountCard }     from '../../../components/AccountCard';
import { AppHeader }       from '../../../components/AppHeader';
import { AppButton }       from '../../../components/AppButton';
import { Icon }            from '../../../components/Icon';
import { CloseButton }     from '../../../components/CloseButton';
import { useTabListPadding } from '../../../hooks/useScreenPadding';
import { Account, AccountType } from '../../../models/types';
import { formatCurrency, parseAmount } from '../../../utils/currency';
import {
  detectInstalledBanks, DetectedBank, getNewBanks, hydrateBankIcons,
} from '../../../services/InstalledBanksService';
import { hasBalanceDivergence } from '../../../services/AccountBalanceService';
import {
  accountSupportsYield,
  estimateMonthlyYield,
  projectCompoundYield,
} from '../../../services/AccountPlanService';

import type { AppIconName } from '../../../components/Icon';

const ACCOUNT_TYPES: Array<{ key: AccountType; typeKey: string; icon: AppIconName }> = [
  { key: 'checking',    typeKey: 'checking',    icon: 'card' },
  { key: 'savings',     typeKey: 'savings',     icon: 'savings' },
  { key: 'credit_card', typeKey: 'creditCard',  icon: 'credit-card' },
  { key: 'investment',  typeKey: 'investment',  icon: 'investment' },
  { key: 'wallet',      typeKey: 'wallet',      icon: 'wallet' },
];

const COLORS = ['#7C3AED', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#0891B2', '#EC4899', '#78716C'];
const DEFAULT_SAVINGS_YIELD = '0,5';

type FormState = {
  name: string; type: AccountType; balance: string; limit: string;
  bankName: string; color: string; informedBalance: string; yieldRate: string;
};

const EMPTY_FORM: FormState = {
  name: '', type: 'checking', balance: '', limit: '',
  bankName: '', color: COLORS[0], informedBalance: '', yieldRate: '',
};

export function AccountsScreen({ navigation }: { navigation?: any }) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const accounts         = useAccountStore(s => s.accounts);
  const totalBalance     = useAccountStore(s => s.totalBalance);
  const isLoading        = useAccountStore(s => s.isLoading);
  const loadAccounts     = useAccountStore(s => s.loadAccounts);
  const addAccount       = useAccountStore(s => s.addAccount);
  const updateAccount    = useAccountStore(s => s.updateAccount);
  const deleteAccount    = useAccountStore(s => s.deleteAccount);
  const reconcileBalance = useAccountStore(s => s.reconcileBalance);

  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [detected, setDetected]       = useState<DetectedBank[]>([]);
  const [detecting, setDetecting]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const listPad = useTabListPadding();

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const openCreate = (prefill?: Partial<FormState>) => {
    resetForm();
    if (prefill) setForm(f => ({ ...f, ...prefill }));
    setShowFormModal(true);
  };

  const openEdit = (account: Account) => {
    setEditingId(account.id);
    setForm({
      name:            account.name,
      type:            account.type,
      balance:         String(account.balance).replace('.', ','),
      informedBalance: String(account.informedBalance ?? account.balance).replace('.', ','),
      limit:           account.limit != null ? String(account.limit).replace('.', ',') : '',
      bankName:        account.bankName ?? '',
      color:           account.color,
      yieldRate:       account.monthlyYieldRate != null
        ? String(account.monthlyYieldRate).replace('.', ',')
        : '',
    });
    setShowFormModal(true);
  };

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setShowDetectModal(true);
    try {
      const list = await detectInstalledBanks(accounts);
      setDetected(list);
      setDetecting(false);
      const withIcons = await hydrateBankIcons(list);
      setDetected(withIcons);
    } catch {
      Alert.alert(t('common.error'), t('accounts.detectError'));
      setDetected([]);
      setDetecting(false);
    }
  }, [accounts, t]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common.warning'), t('accounts.nameRequired'));
      return;
    }
    if (!form.informedBalance.trim() && !form.balance.trim()) {
      Alert.alert(t('common.warning'), t('accounts.balanceRequired'));
      return;
    }
    const balanceNum   = parseAmount(form.balance || form.informedBalance);
    const informedNum  = parseAmount(form.informedBalance || form.balance);
    const limitNum     = form.limit ? parseAmount(form.limit) : undefined;
    const supportsYield = accountSupportsYield(form.type);
    const yieldNum = supportsYield && form.yieldRate.trim()
      ? parseAmount(form.yieldRate)
      : undefined;

    setSaving(true);
    try {
      if (editingId) {
        await updateAccount(editingId, {
          name:             form.name.trim(),
          type:             form.type,
          bankName:         form.bankName.trim() || undefined,
          color:            form.color,
          limit:            limitNum,
          informedBalance:  informedNum,
          monthlyYieldRate: supportsYield ? (yieldNum ?? null) : null,
        });
      } else {
        await addAccount({
          name:             form.name.trim(),
          type:             form.type,
          balance:          balanceNum,
          informedBalance:  informedNum,
          limit:            limitNum,
          color:            form.color,
          bankName:         form.bankName.trim() || undefined,
          monthlyYieldRate: supportsYield ? yieldNum : undefined,
        });
      }
      setShowFormModal(false);
      resetForm();
    } catch {
      Alert.alert(t('common.error'), editingId ? t('accounts.saveError') : t('accounts.createError'));
    } finally {
      setSaving(false);
    }
  }, [form, editingId, addAccount, updateAccount, t]);

  const handleReconcile = useCallback(async () => {
    if (!editingId) return;
    const target = parseAmount(form.informedBalance || form.balance);
    Alert.alert(
      t('accounts.reconcileTitle'),
      t('accounts.reconcileMessage', {
        calculated: formatCurrency(parseAmount(form.balance)),
        informed: formatCurrency(target),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('accounts.reconcileAction'),
          onPress: async () => {
            setSaving(true);
            try {
              await reconcileBalance(editingId, target);
              setForm(f => ({ ...f, balance: String(target).replace('.', ',') }));
              Alert.alert(t('accounts.reconcileSuccessTitle'), t('accounts.reconcileSuccess'));
            } catch {
              Alert.alert(t('common.error'), t('accounts.reconcileError'));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [editingId, form, reconcileBalance, t]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert(t('accounts.deleteTitle'), t('accounts.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteAccount(id) },
    ]);
  }, [deleteAccount, t]);

  const editingAccount = editingId ? accounts.find(a => a.id === editingId) : undefined;
  const showReconcile  = editingAccount && hasBalanceDivergence({
    balance: editingAccount.balance,
    informedBalance: parseAmount(form.informedBalance || form.balance),
  });

  const newBanks = getNewBanks(detected);

  const renderFormFields = () => (
    <>
      {[
        { label: t('accounts.nameLabel'), key: 'name' as const,     ph: t('accounts.namePlaceholder'), num: false },
        { label: t('accounts.bankLabel'),  key: 'bankName' as const, ph: t('accounts.bankPlaceholder'),  num: false },
      ].map(f => (
        <View key={f.key} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            {f.label}
          </Text>
          <TextInput
            value={form[f.key]}
            onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
            placeholder={f.ph}
            placeholderTextColor={colors.placeholder}
            keyboardType="default"
            style={[{
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              color: colors.inputText,
            }, typography.styles.bodyMedium]}
          />
        </View>
      ))}

      <View style={{ marginBottom: spacing.sm }}>
        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('accounts.informedBalanceLabel')}
        </Text>
        <TextInput
          value={form.informedBalance}
          onChangeText={v => setForm(prev => ({
            ...prev,
            informedBalance: v,
            ...(!editingId ? { balance: v } : {}),
          }))}
          placeholder={t('accounts.informedBalancePlaceholder')}
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          style={[{
            backgroundColor: colors.inputBackground,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            color: colors.inputText,
          }, typography.styles.bodyMedium]}
        />
        <Text style={[typography.styles.caption, {
          color: colors.textTertiary,
          marginTop: spacing.xs,
          marginBottom: spacing.md,
        }]}>
          {t('accounts.informedBalanceHint')}
        </Text>
      </View>

      {editingId && (
        <View style={[styles.calculatedBox, {
          backgroundColor: colors.surfaceVariant,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
        }]}>
          <Text style={[typography.styles.labelSmall, { color: colors.textSecondary }]}>
            {t('accounts.calculatedBalance')}
          </Text>
          <Text style={[typography.styles.titleSmall, { color: colors.text, marginTop: 4 }]}>
            {formatCurrency(editingAccount?.balance ?? 0)}
          </Text>
          {showReconcile && (
            <AppButton
              label={t('accounts.reconcileButton')}
              variant="secondary"
              size="sm"
              icon="refresh"
              onPress={handleReconcile}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      )}

      {form.type === 'credit_card' && (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            {t('accounts.creditLimit')}
          </Text>
          <TextInput
            value={form.limit}
            onChangeText={v => setForm(prev => ({ ...prev, limit: v }))}
            placeholder={t('common.amountPlaceholder')}
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            style={[{
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              color: colors.inputText,
            }, typography.styles.bodyMedium]}
          />
        </View>
      )}

      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        {t('accounts.type')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {ACCOUNT_TYPES.map(typeOpt => {
          const sel = form.type === typeOpt.key;
          return (
            <TouchableOpacity
              key={typeOpt.key}
              onPress={() => setForm(prev => {
                const next: FormState = { ...prev, type: typeOpt.key };
                if (accountSupportsYield(typeOpt.key) && !prev.yieldRate.trim()) {
                  next.yieldRate = typeOpt.key === 'savings' ? DEFAULT_SAVINGS_YIELD : prev.yieldRate;
                }
                if (!accountSupportsYield(typeOpt.key)) {
                  next.yieldRate = '';
                }
                return next;
              })}
              style={{
                backgroundColor: sel ? colors.primary : colors.surfaceVariant,
                borderRadius: borderRadius.full,
                paddingHorizontal: 12, paddingVertical: 7,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}
            >
              <Icon name={typeOpt.icon} size={14} color={sel ? '#FFF' : colors.textSecondary} />
              <Text style={[typography.styles.labelSmall, { color: sel ? '#FFF' : colors.textSecondary }]}>
                {t(`accounts.types.${typeOpt.typeKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {accountSupportsYield(form.type) && (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            {t('accounts.yieldRate')}
          </Text>
          <TextInput
            value={form.yieldRate}
            onChangeText={v => setForm(prev => ({ ...prev, yieldRate: v }))}
            placeholder={form.type === 'savings' ? t('accounts.yieldPlaceholderSavings') : t('accounts.yieldPlaceholderInvestment')}
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            style={[{
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              color: colors.inputText,
            }, typography.styles.bodyMedium]}
          />
          <Text style={[typography.styles.caption, {
            color: colors.textTertiary,
            marginTop: spacing.xs,
          }]}>
            {t('accounts.yieldHint')}
          </Text>
          {(() => {
            const bal = parseAmount(form.informedBalance || form.balance);
            const rate = parseAmount(form.yieldRate);
            const monthly = estimateMonthlyYield(bal, rate);
            if (monthly <= 0) return null;
            const in12 = projectCompoundYield(bal, rate, 12) - bal;
            return (
              <View style={[styles.calculatedBox, {
                backgroundColor: colors.surfaceVariant,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginTop: spacing.sm,
              }]}>
                <Text style={[typography.styles.labelSmall, { color: colors.textSecondary }]}>
                  {t('accounts.autoEstimate')}
                </Text>
                <Text style={[typography.styles.titleSmall, { color: colors.success, marginTop: 4 }]}>
                  {t('accounts.estimatePerMonth', { amount: formatCurrency(monthly) })}
                </Text>
                <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  {t('accounts.estimate12Months', { amount: formatCurrency(in12) })}
                </Text>
              </View>
            );
          })()}
        </View>
      )}

      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        {t('accounts.color')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
        {COLORS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setForm(prev => ({ ...prev, color: c }))}
            style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: c,
              borderWidth: form.color === c ? 3 : 0,
              borderColor: '#FFF',
            }}
          />
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('accounts.title')}
        subtitle={t('accounts.totalSubtitle', { amount: formatCurrency(totalBalance) })}
        actions={[
          ...(Platform.OS === 'android'
            ? [{ icon: 'search' as const, onPress: handleDetect }]
            : []),
          { icon: 'add', onPress: () => openCreate(), color: colors.primary },
        ]}
      />

      {Platform.OS === 'android' && (
        <View style={{
          paddingHorizontal: spacing.base,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}>
          <AppButton
            label={t('accounts.detectBanks')}
            variant="secondary"
            icon="bank"
            onPress={handleDetect}
            fullWidth
          />
        </View>
      )}

      <FlatList
        data={accounts}
        keyExtractor={a => String(a.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: listPad }}
        refreshing={isLoading}
        onRefresh={loadAccounts}
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing['3xl'],
            marginTop: spacing['2xl'],
          }]}>
            <Icon name="bank" size={48} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              {t('accounts.noAccounts')}
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              {t('accounts.noAccountsHint')}
            </Text>
            <AppButton
              label={t('accounts.detectBanksShort')}
              variant="primary"
              icon="bank"
              onPress={handleDetect}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <AccountCard
            account={item}
            index={index}
            onPress={openEdit}
            onLongPress={a => handleDelete(a.id)}
            onPlan={a => navigation?.navigate('AccountPlan', { accountId: a.id })}
          />
        )}
      />

      {/* Modal criar / editar */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowFormModal(false); resetForm(); }}
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
              maxHeight: '92%',
            }]}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
                {editingId ? t('accounts.editAccount') : t('accounts.newAccount')}
              </Text>
              <CloseButton onPress={() => { setShowFormModal(false); resetForm(); }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.md }}
              style={{ flexGrow: 0 }}
            >
              {renderFormFields()}
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              gap: spacing.sm,
              paddingTop: spacing.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderLight,
            }}>
              <AppButton
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => { setShowFormModal(false); resetForm(); }}
                style={{ flex: 1 }}
              />
              <AppButton
                label={editingId ? t('common.save') : t('accounts.createAccount')}
                variant="primary"
                onPress={handleSave}
                loading={saving}
                icon="check"
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal detectar bancos */}
      <Modal visible={showDetectModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDetectModal(false)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
              paddingBottom: Math.max(insets.bottom, 20),
              maxHeight: '80%',
            }]}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.xs,
            }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
                {t('accounts.detectedBanks')}
              </Text>
              <CloseButton onPress={() => setShowDetectModal(false)} />
            </View>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              {t('accounts.detectedBanksHint')}
            </Text>

            {detecting ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : detected.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Icon name="bank" size={40} color={colors.textTertiary} />
                <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                  {t('accounts.noBanksFound')}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {detected.map(bank => (
                  <TouchableOpacity
                    key={bank.packageName}
                    disabled={bank.alreadyRegistered}
                    onPress={() => {
                      setShowDetectModal(false);
                      openCreate({
                        name:     bank.name,
                        bankName: bank.name,
                        color:    bank.primaryColor,
                        balance:  '',
                        informedBalance: '',
                      });
                    }}
                    style={[styles.detectRow, {
                      backgroundColor: bank.alreadyRegistered
                        ? colors.surfaceVariant
                        : `${bank.primaryColor}15`,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      opacity: bank.alreadyRegistered ? 0.6 : 1,
                    }]}
                  >
                    {bank.iconUri ? (
                      <Image
                        source={{ uri: bank.iconUri }}
                        style={styles.detectIcon}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.detectIconFallback, { backgroundColor: bank.primaryColor }]}>
                        <Icon name="bank" size={18} color="#FFF" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
                        {bank.name}
                      </Text>
                      <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                        {bank.appLabel}
                      </Text>
                    </View>
                    {bank.alreadyRegistered ? (
                      <Text style={[typography.styles.labelSmall, { color: colors.textSecondary }]}>
                        {t('accounts.registered')}
                      </Text>
                    ) : (
                      <Icon name="add" size={20} color={bank.primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
                {newBanks.length > 0 && (
                  <Text style={[typography.styles.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
                    {t('accounts.tapToRegister')}
                  </Text>
                )}
              </ScrollView>
            )}

            <AppButton
              label={t('common.close')}
              variant="secondary"
              onPress={() => setShowDetectModal(false)}
              style={{ marginTop: spacing.md }}
              fullWidth
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  empty:          { alignItems: 'center' },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  sheet:          { width: '100%' },
  calculatedBox:  {},
  detectRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detectIcon:     { width: 40, height: 40, borderRadius: 10 },
  detectIconFallback: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
});
