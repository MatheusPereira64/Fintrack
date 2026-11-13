import React, { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Platform, Switch, Alert, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '../../../components/CloseButton';
import { AppButton } from '../../../components/AppButton';
import { Icon, AppIconName } from '../../../components/Icon';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useAccountStore }      from '../../../store/accountStore';
import { useCategoryStore }     from '../../../store/categoryStore';
import { Transaction, TransactionType } from '../../../models/types';
import { formatDate, parseLocalISODate, toLocalISODate } from '../../../utils/date';
import { onColor } from '../../../utils/contrast';

const TYPES: Array<{ key: TransactionType; labelKey: string; icon: AppIconName }> = [
  { key: 'expense', labelKey: 'addTransaction.expense', icon: 'expense' },
  { key: 'income',  labelKey: 'addTransaction.income',  icon: 'income' },
];

interface Props {
  navigation: any;
  route:      { params?: { editTransaction?: Transaction } };
}

export function AddTransactionScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useSafeBottomPadding(40);
  const existing = route.params?.editTransaction;

  const addTransaction    = useTransactionStore(s => s.addTransaction);
  const updateTransaction = useTransactionStore(s => s.updateTransaction);
  const accounts          = useAccountStore(s => s.accounts);
  const loadAccounts      = useAccountStore(s => s.loadAccounts);
  const categories        = useCategoryStore(s => s.categories);

  const [type,        setType]        = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount,      setAmount]      = useState(existing ? Math.abs(existing.amount).toFixed(2).replace('.', ',') : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [accountId,   setAccountId]   = useState<number | undefined>(existing?.accountId ?? accounts[0]?.id);
  const [categoryId,  setCategoryId]  = useState<number | undefined>(existing?.categoryId);
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toLocalISODate());
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(toLocalISODate(selected));
  };

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
          accountId,
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
      // Saldos das contas mudam ao lançar, editar valor ou trocar de conta.
      await loadAccounts();
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('addTransaction.saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [
    existing, isValid, parsedAmount, type, description, categoryId, date, accountId,
    isRecurring, showInstallments, installmentCurrent, installmentTotal,
    addTransaction, updateTransaction, loadAccounts, navigation, t,
  ]);

  const filteredCategories = useMemo(() =>
    categories.filter(c => c.id > 0),
    [categories],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* AppHeader não usado aqui pois temos StatusBar personalizada */}
        <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

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
          <Text accessibilityRole="header" numberOfLines={1} style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
            {existing ? t('addTransaction.editTitle') : t('addTransaction.newTitle')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving, busy: isSaving }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[{
              backgroundColor: isValid ? colors.primary : colors.surfaceVariant,
              borderRadius: borderRadius.full,
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.sm,
            }]}
          >
            <Text style={[typography.styles.labelLarge, { color: isValid ? colors.onPrimary : colors.textTertiary }]}>
              {isSaving ? '...' : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad }}
        >
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: type === typeOpt.key }}
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
                  <Icon
                    name={typeOpt.icon}
                    size={24}
                    color={type === typeOpt.key
                      ? (typeOpt.key === 'income' ? colors.income : colors.expense)
                      : colors.textSecondary}
                  />
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
                accessibilityLabel={t('addTransaction.amountLabel')}
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
              accessibilityLabel={t('addTransaction.description')}
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

          {/* Data */}
          <Animated.View entering={FadeInDown.delay(175)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('addTransaction.date')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('addTransaction.date')}: ${formatDate(parseLocalISODate(date), 'medium')}`}
              style={[styles.dateBtn, {
                backgroundColor: colors.inputBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: showDatePicker ? spacing.sm : spacing.xl,
                borderWidth: 1,
                borderColor: colors.border,
              }]}
            >
              <Icon name="calendar" size={20} color={colors.primary} />
              <Text style={[typography.styles.bodyLarge, { color: colors.inputText, marginLeft: spacing.sm, flex: 1 }]}>
                {formatDate(parseLocalISODate(date), 'medium')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={{ marginBottom: spacing.xl }}>
                <DateTimePicker
                  value={parseLocalISODate(date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  locale={i18n.language}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={{ alignSelf: 'flex-end', paddingVertical: spacing.sm }}
                  >
                    <Text style={[typography.styles.labelLarge, { color: colors.primary }]}>
                      {t('goals.confirmDate')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>

          {/* Conta */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('addTransaction.account')}
            </Text>
            {accounts.length === 0 && (
              <View style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: borderRadius.lg,
                padding: spacing.base,
                marginBottom: spacing.xl,
              }}>
                <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
                  {t('addTransaction.noAccountsTitle')}
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {t('addTransaction.noAccountsHint')}
                </Text>
                <AppButton
                  label={t('addTransaction.goToAccounts')}
                  icon="bank"
                  size="sm"
                  onPress={() => navigation.getParent()?.navigate('Accounts')}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ marginBottom: accounts.length > 0 ? spacing.xl : 0 }}
            >
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  onPress={() => setAccountId(acc.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: accountId === acc.id }}
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
                  <Icon name="bank" size={18} color={accountId === acc.id ? onColor(acc.color) : colors.textSecondary} />
                  <Text style={[typography.styles.labelSmall, {
                    color: accountId === acc.id ? onColor(acc.color) : colors.text,
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ marginBottom: spacing.xl }}
            >
              <TouchableOpacity
                onPress={() => setCategoryId(undefined)}
                style={[styles.catChip, {
                  backgroundColor: !categoryId ? colors.primary : colors.surfaceVariant,
                  borderRadius: borderRadius.full,
                  marginRight: spacing.sm,
                }]}
              >
                <Text style={[typography.styles.labelMedium, { color: !categoryId ? colors.onPrimary : colors.textSecondary }]}>
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
                    color: categoryId === cat.id ? onColor(cat.color) : colors.textSecondary,
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
  catChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  dateBtn:      { flexDirection: 'row', alignItems: 'center' },
  recurringRow: { flexDirection: 'row', alignItems: 'center' },
  recurringCheck: { width: 20, height: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
