import React, { useEffect, useCallback, useMemo, useState, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, Platform, StatusBar,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTheme }       from '../../../hooks/useTheme';
import { useAccountStore } from '../../../store/accountStore';
import { AccountCard }    from '../../../components/AccountCard';
import { AccountType }    from '../../../models/types';
import { formatCurrency } from '../../../utils/currency';

const ACCOUNT_TYPES: Array<{ key: AccountType; label: string; icon: string }> = [
  { key: 'checking',    label: 'Conta Corrente', icon: '💳' },
  { key: 'savings',     label: 'Poupança',       icon: '🏦' },
  { key: 'credit_card', label: 'Cartão',         icon: '💰' },
  { key: 'investment',  label: 'Investimentos',  icon: '📈' },
  { key: 'wallet',      label: 'Carteira',       icon: '👛' },
];

const COLORS = ['#7C3AED', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#0891B2', '#EC4899', '#78716C'];

export function AccountsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { accounts, totalBalance, isLoading, loadAccounts, addAccount, deleteAccount } = useAccountStore();

  const [showModal, setShowModal] = useState(false);
  const [name,     setName]     = useState('');
  const [type,     setType]     = useState<AccountType>('checking');
  const [balance,  setBalance]  = useState('');
  const [limit,    setLimit]    = useState('');
  const [bankName, setBankName] = useState('');
  const [color,    setColor]    = useState(COLORS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Digite o nome da conta.');
      return;
    }
    const balanceNum = parseFloat(balance.replace(',', '.')) || 0;
    const limitNum   = parseFloat(limit.replace(',', '.'))   || undefined;

    setSaving(true);
    try {
      await addAccount({
        name:     name.trim(),
        type,
        balance:  balanceNum,
        limit:    limitNum,
        color,
        bankName: bankName.trim() || undefined,
      });
      setShowModal(false);
      setName(''); setBalance(''); setLimit(''); setBankName('');
      setType('checking'); setColor(COLORS[0]);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a conta.');
    } finally {
      setSaving(false);
    }
  }, [name, type, balance, limit, bankName, color, addAccount]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert('Excluir conta', 'Isso irá excluir a conta e todas as suas transações.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteAccount(id) },
    ]);
  }, [deleteAccount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: colors.header,
        paddingTop: Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.base,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      }]}>
        <View>
          <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>Contas</Text>
          <Text style={[typography.styles.bodyMedium, { color: colors.primary }]}>
            Total: {formatCurrency(totalBalance)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}
        >
          <Text style={{ color: '#FFF', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={a => String(a.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        refreshing={isLoading}
        onRefresh={loadAccounts}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing['3xl'],
            marginTop: spacing['2xl'],
          }]}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>🏦</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              Nenhuma conta
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Adicione sua primeira conta para começar.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <AccountCard
            account={item}
            index={index}
            onLongPress={() => handleDelete(item.id)}
          />
        )}
      />

      {/* Modal de criar conta */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
              maxHeight: '85%',
            }]}
          >
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Nova conta
            </Text>

            {[
              { label: 'Nome *',        val: name,     setter: setName,     ph: 'Ex: Nubank, BB, Carteira' },
              { label: 'Banco',         val: bankName, setter: setBankName, ph: 'Ex: Nubank, Itaú'         },
              { label: 'Saldo inicial', val: balance,  setter: setBalance,  ph: '0,00', num: true          },
            ].map((f, i) => (
              <View key={i} style={{ marginBottom: spacing.md }}>
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                  {f.label}
                </Text>
                <TextInput
                  value={f.val}
                  onChangeText={f.setter as any}
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

            {/* Tipo */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Tipo
            </Text>
            <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }]}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={[{
                    backgroundColor: type === t.key ? colors.primary : colors.surfaceVariant,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: 12, paddingVertical: 6,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }]}
                >
                  <Text style={{ fontSize: 14 }}>{t.icon}</Text>
                  <Text style={[typography.styles.labelSmall, {
                    color: type === t.key ? '#FFF' : colors.textSecondary,
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cor */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Cor
            </Text>
            <View style={[{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }]}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: '#FFF',
                    elevation: color === c ? 3 : 0,
                  }]}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[{ flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, padding: 12 }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={[{ flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.full, padding: 12 }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  {saving ? '...' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  addBtn:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  empty:     { alignItems: 'center' },
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  sheet:     {},
});
