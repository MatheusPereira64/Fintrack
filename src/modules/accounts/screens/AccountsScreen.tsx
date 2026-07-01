import React, { useEffect, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useTheme }        from '../../../hooks/useTheme';
import { useAccountStore } from '../../../store/accountStore';
import { AccountCard }     from '../../../components/AccountCard';
import { AppHeader }       from '../../../components/AppHeader';
import { AppButton }       from '../../../components/AppButton';
import { Icon }            from '../../../components/Icon';
import { Account, AccountType } from '../../../models/types';
import { formatCurrency, parseAmount } from '../../../utils/currency';
import {
  detectInstalledBanks, DetectedBank, getNewBanks,
} from '../../../services/InstalledBanksService';
import { hasBalanceDivergence } from '../../../services/AccountBalanceService';

import type { AppIconName } from '../../../components/Icon';

const ACCOUNT_TYPES: Array<{ key: AccountType; label: string; icon: AppIconName }> = [
  { key: 'checking',    label: 'Conta Corrente', icon: 'card' },
  { key: 'savings',     label: 'Poupança',       icon: 'savings' },
  { key: 'credit_card', label: 'Cartão',         icon: 'credit-card' },
  { key: 'investment',  label: 'Investimentos',  icon: 'investment' },
  { key: 'wallet',      label: 'Carteira',       icon: 'wallet' },
];

const COLORS = ['#7C3AED', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#0891B2', '#EC4899', '#78716C'];

type FormState = {
  name: string; type: AccountType; balance: string; limit: string;
  bankName: string; color: string; informedBalance: string;
};

const EMPTY_FORM: FormState = {
  name: '', type: 'checking', balance: '', limit: '',
  bankName: '', color: COLORS[0], informedBalance: '',
};

export function AccountsScreen(_props: { navigation?: unknown }) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    accounts, totalBalance, isLoading, loadAccounts,
    addAccount, updateAccount, deleteAccount,
    reconcileBalance,
  } = useAccountStore();

  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetectModal, setShowDetectModal] = useState(false);
  const [detected, setDetected]       = useState<DetectedBank[]>([]);
  const [detecting, setDetecting]     = useState(false);
  const [saving, setSaving]           = useState(false);

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
    });
    setShowFormModal(true);
  };

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setShowDetectModal(true);
    try {
      const list = await detectInstalledBanks(accounts);
      setDetected(list);
    } catch {
      Alert.alert('Erro', 'Não foi possível detectar bancos instalados.');
      setDetected([]);
    } finally {
      setDetecting(false);
    }
  }, [accounts]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Atenção', 'Digite o nome da conta.');
      return;
    }
    const balanceNum   = parseAmount(form.balance);
    const informedNum  = parseAmount(form.informedBalance || form.balance);
    const limitNum     = form.limit ? parseAmount(form.limit) : undefined;

    setSaving(true);
    try {
      if (editingId) {
        await updateAccount(editingId, {
          name:            form.name.trim(),
          type:            form.type,
          bankName:        form.bankName.trim() || undefined,
          color:           form.color,
          limit:           limitNum,
          informedBalance: informedNum,
        });
      } else {
        await addAccount({
          name:            form.name.trim(),
          type:            form.type,
          balance:         balanceNum,
          informedBalance: informedNum,
          limit:           limitNum,
          color:           form.color,
          bankName:        form.bankName.trim() || undefined,
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
        { label: 'Nome *',        key: 'name' as const,            ph: 'Ex: Nubank, BB, Carteira', num: false },
        { label: 'Banco',         key: 'bankName' as const,        ph: 'Ex: Nubank, Itaú, Inter',  num: false },
        { label: editingId ? 'Saldo informado (app do banco)' : 'Saldo inicial',
          key: 'informedBalance' as const, ph: '0,00', num: true },
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
            keyboardType={f.num ? 'decimal-pad' : 'default'}
            style={[{
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              color: colors.inputText,
            }, typography.styles.bodyMedium]}
          />
        </View>
      ))}

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

      {!editingId && (
        <View style={{ marginBottom: spacing.md }}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Saldo inicial (calculado)
          </Text>
          <TextInput
            value={form.balance}
            onChangeText={v => setForm(prev => ({ ...prev, balance: v }))}
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
              onPress={() => setForm(prev => ({ ...prev, type: t.key }))}
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

      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        Cor
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }}>
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
        <View style={{ paddingHorizontal: spacing.base, paddingBottom: spacing.sm }}>
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
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
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
          />
        )}
      />

      {/* Modal criar / editar */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => { setShowFormModal(false); resetForm(); }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View
              entering={SlideInDown.duration(300)}
              style={[styles.sheet, {
                backgroundColor: colors.card,
                borderTopLeftRadius: borderRadius['2xl'],
                borderTopRightRadius: borderRadius['2xl'],
                padding: spacing.xl,
                paddingBottom: Math.max(insets.bottom, 20),
                maxHeight: '90%',
              }]}
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
                  {editingId ? 'Editar conta' : 'Nova conta'}
                </Text>
                {renderFormFields()}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal detectar bancos */}
      <Modal visible={showDetectModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowDetectModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
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
              <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.xs }]}>
                Bancos detectados
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
                Apps bancários instalados no seu celular.
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
                          balance:  '0',
                          informedBalance: '0',
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
                      <View style={[styles.detectDot, { backgroundColor: bank.primaryColor }]} />
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  empty:          { alignItems: 'center' },
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  sheet:          {},
  calculatedBox:  {},
  detectRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detectDot:      { width: 12, height: 12, borderRadius: 6 },
});
