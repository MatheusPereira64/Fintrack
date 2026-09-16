import React, { useEffect, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView, Platform, ActivityIndicator, Image,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
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

const ACCOUNT_TYPES: Array<{ key: AccountType; label: string; icon: AppIconName }> = [
  { key: 'checking',    label: 'Conta Corrente', icon: 'card' },
  { key: 'savings',     label: 'Poupança',       icon: 'savings' },
  { key: 'credit_card', label: 'Cartão',         icon: 'credit-card' },
  { key: 'investment',  label: 'Investimentos',  icon: 'investment' },
  { key: 'wallet',      label: 'Carteira',       icon: 'wallet' },
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
      Alert.alert('Erro', 'Não foi possível detectar bancos instalados.');
      setDetected([]);
      setDetecting(false);
    }
  }, [accounts]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Atenção', 'Digite o nome da conta.');
      return;
    }
    if (!form.informedBalance.trim() && !form.balance.trim()) {
      Alert.alert('Atenção', 'Informe o saldo que aparece no app do banco.');
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
      Alert.alert('Erro', editingId ? 'Não foi possível salvar.' : 'Não foi possível criar a conta.');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, addAccount, updateAccount]);

  const handleReconcile = useCallback(async () => {
    if (!editingId) return;
    const target = parseAmount(form.informedBalance || form.balance);
    Alert.alert(
      'Ajustar saldo calculado',
      `Isso criará um ajuste para igualar o saldo calculado (${formatCurrency(parseAmount(form.balance))}) ao informado (${formatCurrency(target)}).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ajustar',
          onPress: async () => {
            setSaving(true);
            try {
              await reconcileBalance(editingId, target);
              setForm(f => ({ ...f, balance: String(target).replace('.', ',') }));
              Alert.alert('Pronto', 'Saldo reconciliado com sucesso.');
            } catch {
              Alert.alert('Erro', 'Não foi possível reconciliar.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [editingId, form, reconcileBalance]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Excluir conta', 'Isso irá excluir a conta e todas as suas transações.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteAccount(id) },
    ]);
  }, [deleteAccount]);

  const editingAccount = editingId ? accounts.find(a => a.id === editingId) : undefined;
  const showReconcile  = editingAccount && hasBalanceDivergence({
    balance: editingAccount.balance,
    informedBalance: parseAmount(form.informedBalance || form.balance),
  });

  const newBanks = getNewBanks(detected);

  const renderFormFields = () => (
    <>
      {[
        { label: 'Nome *', key: 'name' as const,     ph: 'Ex: Nubank, BB, Carteira', num: false },
        { label: 'Banco',  key: 'bankName' as const, ph: 'Ex: Nubank, Itaú, Inter',  num: false },
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
          Saldo no app do banco *
        </Text>
        <TextInput
          value={form.informedBalance}
          onChangeText={v => setForm(prev => ({
            ...prev,
            informedBalance: v,
            ...(!editingId ? { balance: v } : {}),
          }))}
          placeholder="Valor que aparece no app do banco"
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
          Bancos não liberam saldo via API sem Open Finance. Atualize este valor sempre que quiser manter o FinTrack alinhado.
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
            Saldo calculado (transações)
          </Text>
          <Text style={[typography.styles.titleSmall, { color: colors.text, marginTop: 4 }]}>
            {formatCurrency(editingAccount?.balance ?? 0)}
          </Text>
          {showReconcile && (
            <AppButton
              label="Ajustar saldo calculado"
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
            Limite do cartão
          </Text>
          <TextInput
            value={form.limit}
            onChangeText={v => setForm(prev => ({ ...prev, limit: v }))}
            placeholder="0,00"
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
        Tipo
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {ACCOUNT_TYPES.map(t => {
          const sel = form.type === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setForm(prev => {
                const next: FormState = { ...prev, type: t.key };
                if (accountSupportsYield(t.key) && !prev.yieldRate.trim()) {
                  next.yieldRate = t.key === 'savings' ? DEFAULT_SAVINGS_YIELD : prev.yieldRate;
                }
                if (!accountSupportsYield(t.key)) {
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
              <Icon name={t.icon} size={14} color={sel ? '#FFF' : colors.textSecondary} />
              <Text style={[typography.styles.labelSmall, { color: sel ? '#FFF' : colors.textSecondary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {accountSupportsYield(form.type) && (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Rendimento (% a.m.)
          </Text>
          <TextInput
            value={form.yieldRate}
            onChangeText={v => setForm(prev => ({ ...prev, yieldRate: v }))}
            placeholder={form.type === 'savings' ? 'Ex: 0,5' : 'Ex: 0,8'}
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
            Informe a taxa mensal da poupança ou do investimento. O app calcula o rendimento estimado automaticamente.
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
                  Estimativa automática
                </Text>
                <Text style={[typography.styles.titleSmall, { color: colors.success, marginTop: 4 }]}>
                  ≈ {formatCurrency(monthly)} / mês
                </Text>
                <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                  Em 12 meses (composto): ≈ {formatCurrency(in12)} de rendimento
                </Text>
              </View>
            );
          })()}
        </View>
      )}

      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        Cor
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
        title="Contas"
        subtitle={`Total: ${formatCurrency(totalBalance)}`}
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
            label="Detectar bancos no celular"
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
              Nenhuma conta
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Detecte bancos instalados ou adicione manualmente.
            </Text>
            <AppButton
              label="Detectar bancos"
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
                {editingId ? 'Editar conta' : 'Nova conta'}
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
                label="Cancelar"
                variant="secondary"
                onPress={() => { setShowFormModal(false); resetForm(); }}
                style={{ flex: 1 }}
              />
              <AppButton
                label={editingId ? 'Salvar' : 'Criar conta'}
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
                Bancos detectados
              </Text>
              <CloseButton onPress={() => setShowDetectModal(false)} />
            </View>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              Apps instalados no celular. Toque para cadastrar e informar o saldo manualmente — os bancos não compartilham saldo sem Open Finance.
            </Text>

            {detecting ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : detected.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                <Icon name="bank" size={40} color={colors.textTertiary} />
                <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
                  Nenhum app bancário compatível encontrado.
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
                        Cadastrado
                      </Text>
                    ) : (
                      <Icon name="add" size={20} color={bank.primaryColor} />
                    )}
                  </TouchableOpacity>
                ))}
                {newBanks.length > 0 && (
                  <Text style={[typography.styles.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm }]}>
                    Toque em um banco para cadastrar e informar o saldo.
                  </Text>
                )}
              </ScrollView>
            )}

            <AppButton
              label="Fechar"
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
