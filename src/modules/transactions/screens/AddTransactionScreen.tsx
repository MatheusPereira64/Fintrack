import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, Switch, Alert, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useAccountStore }      from '../../../store/accountStore';
import { useCategoryStore }     from '../../../store/categoryStore';
import { Transaction, TransactionType } from '../../../models/types';

const TYPES: Array<{ key: TransactionType; label: string; icon: string }> = [
  { key: 'expense', label: 'Despesa', icon: '📤' },
  { key: 'income',  label: 'Receita', icon: '📥' },
];

interface Props {
  navigation: any;
  route:      { params?: { editTransaction?: Transaction } };
}

export function AddTransactionScreen({ navigation, route }: Props) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const existing = route.params?.editTransaction;

  const { addTransaction, updateTransaction } = useTransactionStore();
  const { accounts } = useAccountStore();
  const { categories } = useCategoryStore();

  const [type,        setType]        = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount,      setAmount]      = useState(existing ? Math.abs(existing.amount).toFixed(2).replace('.', ',') : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [accountId,   setAccountId]   = useState<number | undefined>(existing?.accountId ?? accounts[0]?.id);
  const [categoryId,  setCategoryId]  = useState<number | undefined>(existing?.categoryId);
  const [date,        setDate]        = useState(existing?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? false);
  const [isSaving,    setIsSaving]    = useState(false);

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }, [amount]);

  const isValid = parsedAmount > 0 && description.trim().length > 0 && accountId !== undefined;

  const handleSave = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Atenção', 'Preencha o valor, descrição e selecione uma conta.');
      return;
    }
    setIsSaving(true);
    try {
      const finalAmount = type === 'expense' ? -parsedAmount : parsedAmount;

      if (existing) {
        await updateTransaction(existing.id, {
          amount: finalAmount, description: description.trim(),
          categoryId, date, type, isRecurring,
        });
      } else {
        await addTransaction({
          accountId:   accountId!,
          categoryId,
          amount:      finalAmount,
          description: description.trim(),
          type,
          date,
          isRecurring,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setIsSaving(false);
    }
  }, [existing, isValid, parsedAmount, type, description, categoryId, date, accountId, isRecurring]);

  const filteredCategories = useMemo(() =>
    categories.filter(c => c.id > 0),
    [categories],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* AppHeader não usado aqui pois temos StatusBar personalizada */}
        {(() => { const StatusBarComp = require('react-native').StatusBar; return <StatusBarComp barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />; })()}

        {/* Header */}
        <View style={[styles.header, {
          backgroundColor: colors.header,
          paddingTop: Math.max(insets.top, 20),
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.base,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
          flexDirection: 'row', alignItems: 'center',
        }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: spacing.xs, marginRight: spacing.sm }}>
            <Text style={[typography.styles.titleMedium, { color: colors.primary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1 }]}>
            {existing ? 'Editar transação' : 'Nova transação'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid || isSaving}
            style={[{
              backgroundColor: isValid ? colors.primary : colors.surfaceVariant,
              borderRadius: borderRadius.full,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            }]}
          >
            <Text style={[typography.styles.labelLarge, { color: isValid ? '#FFF' : colors.textTertiary }]}>
              {isSaving ? '...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}>
          {/* Tipo */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Tipo
            </Text>
            <View style={[styles.typeRow, { marginBottom: spacing.xl }]}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setType(t.key)}
                  style={[styles.typeBtn, {
                    backgroundColor: type === t.key
                      ? (t.key === 'income' ? `${colors.income}20` : `${colors.expense}20`)
                      : colors.card,
                    borderRadius: borderRadius.lg,
                    borderWidth: 2,
                    borderColor: type === t.key
                      ? (t.key === 'income' ? colors.income : colors.expense)
                      : colors.borderLight,
                  }]}
                >
                  <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                  <Text style={[typography.styles.titleSmall, {
                    color: type === t.key
                      ? (t.key === 'income' ? colors.income : colors.expense)
                      : colors.textSecondary,
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Valor */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Valor (R$)
            </Text>
            <View style={[styles.inputWrap, {
              backgroundColor: colors.inputBackground,
              borderRadius: borderRadius.lg,
              marginBottom: spacing.xl,
              borderWidth: 1,
              borderColor: parsedAmount > 0 ? (type === 'income' ? colors.income : colors.expense) : colors.border,
            }]}>
              <Text style={[typography.styles.headlineSmall, { color: colors.textTertiary, paddingLeft: spacing.md }]}>R$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.placeholder}
                style={[typography.styles.headlineSmall, {
                  color: colors.inputText, flex: 1, padding: spacing.md,
                }]}
              />
            </View>
          </Animated.View>

          {/* Descrição */}
          <Animated.View entering={FadeInDown.delay(150)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Descrição
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Supermercado, Uber, Salário..."
              placeholderTextColor={colors.placeholder}
              style={[{
                backgroundColor: colors.inputBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                color: colors.inputText,
                marginBottom: spacing.xl,
                borderWidth: 1,
                borderColor: description.trim() ? colors.primary : colors.border,
              }, typography.styles.bodyLarge]}
            />
          </Animated.View>

          {/* Conta */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Conta
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setAccountId(acc.id)}
                  style={[{
                    backgroundColor: accountId === acc.id ? acc.color : colors.card,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    marginRight: spacing.sm,
                    alignItems: 'center',
                    minWidth: 100,
                    borderWidth: 2,
                    borderColor: accountId === acc.id ? acc.color : colors.borderLight,
                  }]}
                >
                  <Text style={{ fontSize: 18 }}>🏦</Text>
                  <Text style={[typography.styles.labelSmall, {
                    color: accountId === acc.id ? '#FFF' : colors.text,
                    marginTop: 4, textAlign: 'center',
                  }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Categoria */}
          <Animated.View entering={FadeInDown.delay(250)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Categoria
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
              <TouchableOpacity
                onPress={() => setCategoryId(undefined)}
                style={[styles.catChip, {
                  backgroundColor: !categoryId ? colors.primary : colors.surfaceVariant,
                  borderRadius: borderRadius.full,
                  marginRight: spacing.sm,
                }]}
              >
                <Text style={[typography.styles.labelMedium, { color: !categoryId ? '#FFF' : colors.textSecondary }]}>
                  Nenhuma
                </Text>
              </TouchableOpacity>
              {filteredCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[styles.catChip, {
                    backgroundColor: categoryId === cat.id ? cat.color : colors.surfaceVariant,
                    borderRadius: borderRadius.full,
                    marginRight: spacing.sm,
                  }]}
                >
                  <Text style={{ fontSize: 14 }}>{cat.icon ?? '📦'}</Text>
                  <Text style={[typography.styles.labelSmall, {
                    color: categoryId === cat.id ? '#FFF' : colors.textSecondary,
                    marginLeft: 4,
                  }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Recorrente */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <View style={[styles.recurringRow, {
              backgroundColor: colors.card,
              borderRadius: borderRadius.lg,
              padding: spacing.base,
              borderWidth: 1,
              borderColor: isRecurring ? colors.primary : colors.borderLight,
            }]}>
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <Text style={[typography.styles.bodyLarge, { color: colors.text }]}>
                  Repetir mensalmente
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  Lançado automaticamente todo mês
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.borderLight, true: `${colors.primary}60` }}
                thumbColor={isRecurring ? colors.primary : colors.border}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeRow:      { flexDirection: 'row', gap: 12 },
  typeBtn:      { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 8 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center' },
  catChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  recurringRow: { flexDirection: 'row', alignItems: 'center' },
  recurringCheck: { width: 20, height: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
