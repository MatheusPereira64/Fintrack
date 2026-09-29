import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { UnrecognizedNotificationRepository } from '../../../database/repositories/UnrecognizedNotificationRepository';
import { TaughtPatternRepository } from '../../../database/repositories/TaughtPatternRepository';
import { PendingReviewRepository } from '../../../database/repositories/PendingReviewRepository';
import { applyTaughtPattern } from '../services/TaughtPatternMatcher';
import { getBankConfig } from '../services/BankRegistry';
import { TransactionType, UnrecognizedNotification } from '../../../models/types';
import { useCategoryStore } from '../../../store/categoryStore';
import { useReviewStore } from '../../../store/reviewStore';

const TYPES: Array<{ key: TransactionType; labelKey: string }> = [
  { key: 'expense', labelKey: 'addTransaction.expense' },
  { key: 'income', labelKey: 'addTransaction.income' },
];

interface Props {
  navigation: any;
  route: { params: { unrecognizedId: number } };
}

export function TeachPatternScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(40);
  const unrecognizedId = route.params.unrecognizedId;

  const categories = useCategoryStore(s => s.categories);
  const refreshCounts = useReviewStore(s => s.refreshCounts);
  const loadUnrecognized = useReviewStore(s => s.loadUnrecognized);

  const [item, setItem] = useState<UnrecognizedNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snippet, setSnippet] = useState('');
  const [regex, setRegex] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('Outros');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await UnrecognizedNotificationRepository.findById(unrecognizedId);
      if (!row || row.status !== 'open') {
        Alert.alert(t('common.warning'), t('teachPattern.notFound'));
        navigation.goBack();
        return;
      }
      setItem(row);
      setSnippet(row.title?.trim() || row.body.slice(0, 40));
      setDescription(row.title || '');
      setBankName(getBankConfig(row.packageName)?.name ?? '');
    } finally {
      setLoading(false);
    }
  }, [unrecognizedId, navigation, t]);

  useEffect(() => { void load(); }, [load]);

  const categoryOptions = useMemo(() => {
    const names = categories.map(c => c.name);
    if (!names.includes(category)) names.unshift(category);
    return names;
  }, [categories, category]);

  const handleSave = async () => {
    if (!item) return;
    if (!snippet.trim() && !regex.trim()) {
      Alert.alert(t('common.warning'), t('teachPattern.matchRequired'));
      return;
    }
    if (regex.trim()) {
      try {
        // eslint-disable-next-line no-new
        new RegExp(regex.trim(), 'i');
      } catch {
        Alert.alert(t('common.warning'), t('teachPattern.invalidRegex'));
        return;
      }
    }

    setSaving(true);
    try {
      const pattern = await TaughtPatternRepository.insert({
        packageName: item.packageName,
        name: description.trim() || snippet.trim() || item.title,
        matchSnippet: snippet.trim() || undefined,
        matchRegex: regex.trim() || undefined,
        transactionType: type,
        category,
        descriptionTemplate: description.trim() || undefined,
        bankName: bankName.trim() || getBankConfig(item.packageName)?.name,
      });

      const fullBody = [item.title, item.body, item.subText].filter(Boolean).join(' ');
      const parsed = applyTaughtPattern(pattern, item.title, fullBody);
      if (parsed) {
        await PendingReviewRepository.insert({
          packageName:         item.packageName,
          title:               item.title,
          body:                item.body,
          subText:             item.subText,
          notificationTs:      item.notificationTs,
          proposedType:        parsed.type,
          proposedCategory:    parsed.category,
          proposedAmount:      parsed.amount,
          proposedDescription: parsed.description,
          proposedBankName:    parsed.bankName,
        });
      }

      await UnrecognizedNotificationRepository.setStatus(item.id, 'taught');
      await refreshCounts();
      await loadUnrecognized();

      Alert.alert(
        t('common.success'),
        parsed ? t('teachPattern.savedWithReview') : t('teachPattern.saved'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert(t('common.error'), t('teachPattern.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={t('teachPattern.title')}
        onClose={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('teachPattern.rawNotification')}
        </Text>
        <View style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          marginBottom: spacing.lg,
        }}>
          <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{item.title}</Text>
          <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>
            {item.body}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 8 }]}>
            {item.packageName}
          </Text>
        </View>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('teachPattern.snippet')}
        </Text>
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>
          {t('teachPattern.snippetHint')}
        </Text>
        <TextInput
          value={snippet}
          onChangeText={setSnippet}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('teachPattern.regex')}
        </Text>
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginBottom: spacing.xs }]}>
          {t('teachPattern.regexHint')}
        </Text>
        <TextInput
          value={regex}
          onChangeText={setRegex}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('teachPattern.regexPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.type')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {TYPES.map(opt => {
            const active = type === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setType(opt.key)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md,
                  backgroundColor: active ? colors.primary : colors.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.styles.bodySmall, {
                  color: active ? '#FFF' : colors.text,
                  fontWeight: '600',
                }]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.description')}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('reviewQueue.bankName')}
        </Text>
        <TextInput
          value={bankName}
          onChangeText={setBankName}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            borderRadius: borderRadius.md,
            marginBottom: spacing.base,
          }]}
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          {t('addTransaction.category')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.xl }}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {categoryOptions.slice(0, 40).map(name => {
            const active = category === name;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => setCategory(name)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: active ? colors.primary : colors.surfaceVariant,
                }}
              >
                <Text style={{
                  color: active ? '#FFF' : colors.text,
                  fontSize: 13,
                  fontWeight: '500',
                }}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>
            {t('teachPattern.save')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
