import React, { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, Switch, Alert, KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '../../../components/CloseButton';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useAccountStore }      from '../../../store/accountStore';
import { useCategoryStore }     from '../../../store/categoryStore';
import { Transaction, TransactionType } from '../../../models/types';

const TYPES: Array<{ key: TransactionType; labelKey: string; icon: string }> = [
  { key: 'expense', labelKey: 'addTransaction.expense', icon: '📤' },
  { key: 'income',  labelKey: 'addTransaction.income',  icon: '📥' },
];

interface Props {
  navigation: any;
  route:      { params?: { editTransaction?: Transaction } };
}

export function AddTransactionScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useSafeBottomPadding(40);
  const existing = route.params?.editTransaction;

  const addTransaction    = useTransactionStore(s => s.addTransaction);
  const updateTransaction = useTransactionStore(s => s.updateTransaction);
  const accounts          = useAccountStore(s => s.accounts);
  const categories        = useCategoryStore(s => s.categories);

  const [type,        setType]        = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount,      setAmount]      = useState(existing ? Math.abs(existing.amount).toFixed(2).replace('.', ',') : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [accountId,   setAccountId]   = useState<number | undefined>(existing?.accountId ?? accounts[0]?.id);
  const [categoryId,  setCategoryId]  = useState<number | undefined>(existing?.categoryId);
  const [date] = useState(existing?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(existing?.isRecurring ?? false);
  const [installmentCurrent, setInstallmentCurrent] = useState(
    existing?.installmentCurrent != null ? String(existing.installmentCurrent) : '',
  );
  const [installmentTotal, setInstallmentTotal] = useState(
    existing?.installmentTotal != null ? String(existing.installmentTotal) : '',
  );
  const [isSaving,    setIsSaving]    = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === accountId),
    [accounts, accountId],
  );
  const showInstallments = selectedAccount?.type === 'credit_card';

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }, [amount]);

  const isValid = parsedAmount > 0 && description.trim().length > 0 && accountId !== undefined;

  const handleSave = useCallback(async () => {
    if (!isValid) {
      Alert.alert(t('common.warning'), t('addTransaction.validationError'));
      return;
    }
    setIsSaving(true);
    try {
      const finalAmount = type === 'expense' ? -parsedAmount : parsedAmount;
      let instCurrent: number | null = null;
      let instTotal: number | null = null;
      if (showInstallments) {
        const c = parseInt(installmentCurrent, 10);
        const tot = parseInt(installmentTotal, 10);
        if (Number.isInteger(c) && Number.isInteger(tot) && c >= 1 && tot >= 2 && c <= tot) {
          instCurrent = c;
          instTotal = tot;
        } else if (installmentCurrent.trim() || installmentTotal.trim()) {
          Alert.alert(t('common.warning'), t('addTransaction.installmentInvalid'));
          setIsSaving(false);
          return;
        }
      }

      if (existing) {
        await updateTransaction(existing.id, {
          amount: finalAmount, description: description.trim(),
          categoryId, date, type, isRecurring,
          installmentCurrent: showInstallments ? instCurrent : null,
          installmentTotal: showInstallments ? instTotal : null,
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
          installmentCurrent: showInstallments ? instCurrent : undefined,
          installmentTotal: showInstallments ? instTotal : undefined,
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('addTransaction.saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [
    existing, isValid, parsedAmount, type, description, categoryId, date, accountId,
    isRecurring, showInstallments, installmentCurrent, installmentTotal,
    addTransaction, updateTransaction, navigation, t,
  ]);

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
          <CloseButton onPress={() => navigation.goBack()} style={{ marginRight: spacing.sm }} />
          <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1 }]}>
            {existing ? t('addTransaction.editTitle') : t('addTransaction.newTitle')}
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
              {isSaving ? '...' : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad }}>
          {/* Tipo */}
          <Animated.View entering={FadeInDown.delay(50)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('addTransaction.type')}
            </Text>
            <View style={[styles.typeRow, { marginBottom: spacing.xl }]}>
              {TYPES.map(typeOpt => (
                <TouchableOpacity
                  key={typeOpt.key}
                  onPress={() => setType(typeOpt.key)}
                  style={[styles.typeBtn, {
                    backgroundColor: type === typeOpt.key
                      ? (typeOpt.key === 'income' ? `${colors.income}20` : `${colors.expense}20`)
                      : colors.card,
                    borderRadius: borderRadius.lg,
                    borderWidth: 2,
                    borderColor: type === typeOpt.key
                      ? (typeOpt.key === 'income' ? colors.income : colors.expense)
                      : colors.borderLight,
                  }]}
                >
                  <Text style={{ fontSize: 22 }}>{typeOpt.icon}</Text>
                  <Text style={[typography.styles.titleSmall, {
                    color: type === typeOpt.key
                      ? (typeOpt.key === 'income' ? colors.income : colors.expense)
                      : colors.textSecondary,
                  }]}>
                    {t(typeOpt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Valor */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('addTransaction.amountLabel')}
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
                placeholder={t('common.amountPlaceholder')}
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
              {t('addTransaction.description')}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('addTransaction.descriptionPlaceholder')}
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
              {t('addTransaction.account')}
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
              {t('addTransaction.category')}
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
                  {t('addTransaction.none')}
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
              marginBottom: showInstallments ? spacing.xl : 0,
            }]}>
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <Text style={[typography.styles.bodyLarge, { color: colors.text }]}>
                  {t('addTransaction.repeatMonthly')}
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {t('addTransaction.repeatHint')}
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

          {showInstallments && (
            <Animated.View entering={FadeInDown.delay(350)}>
              <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {t('addTransaction.installments')}
              </Text>
              <Text style={[typography.styles.caption, {
                color: colors.textTertiary,
                marginBottom: spacing.sm,
              }]}>
                {t('addTransaction.installmentsHint')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                <TextInput
                  value={installmentCurrent}
                  onChangeText={v => setInstallmentCurrent(v.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder={t('addTransaction.installmentCurrent')}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  style={[{
                    flex: 1,
                    backgroundColor: colors.inputBackground,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    color: colors.inputText,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }, typography.styles.bodyLarge]}
                />
                <Text style={[typography.styles.bodyLarge, { color: colors.textSecondary }]}>
                  {t('addTransaction.installmentOf')}
                </Text>
                <TextInput
                  value={installmentTotal}
                  onChangeText={v => setInstallmentTotal(v.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder={t('addTransaction.installmentTotal')}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  style={[{
                    flex: 1,
                    backgroundColor: colors.inputBackground,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    color: colors.inputText,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }, typography.styles.bodyLarge]}
                />
              </View>
            </Animated.View>
          )}
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
