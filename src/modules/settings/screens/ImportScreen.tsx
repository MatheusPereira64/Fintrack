import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme }            from '../../../hooks/useTheme';
import { useAccountStore }     from '../../../store/accountStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { AppHeader }           from '../../../components/AppHeader';
import { AppButton }           from '../../../components/AppButton';
import { Icon }                from '../../../components/Icon';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { formatCurrency }      from '../../../utils/currency';
import {
  pickImportFile, parseImportFile, ImportCandidate,
} from '../../../services/ImportService';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';

export function ImportScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = useSafeBottomPadding(24);

  const accounts     = useAccountStore(s => s.accounts);
  const loadByMonth  = useTransactionStore(s => s.loadByMonth);
  const currentMonth = useTransactionStore(s => s.currentMonth);

  const [candidates,  setCandidates]  = useState<ImportCandidate[]>([]);
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [imported,    setImported]    = useState(0);
  const [fileInfo,    setFileInfo]    = useState<{ name: string; count: number } | null>(null);

  const defaultAccountId = accounts[0]?.id;

  const handlePick = useCallback(async () => {
    setLoading(true);
    try {
      const file = await pickImportFile();
      if (!file) { setLoading(false); return; }

      const result = await parseImportFile(file);
      if (!result.success || result.candidates.length === 0) {
        Alert.alert(
          t('import.noTransactionsTitle'),
          result.errors.join('\n') || t('import.emptyOrUnsupported'),
        );
        setLoading(false);
        return;
      }

      setCandidates(result.candidates);
      setSelected(new Set(result.candidates.map((_, i) => i)));
      setFileInfo({ name: file.name ?? 'arquivo', count: result.candidates.length });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('import.readError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleSave = useCallback(async () => {
    if (!defaultAccountId) {
      Alert.alert(t('common.warning'), t('import.needAccount'));
      return;
    }
    if (selected.size === 0) {
      Alert.alert(t('common.warning'), t('import.needSelection'));
      return;
    }

    setSaving(true);
    let count = 0;
    try {
      for (const idx of selected) {
        const c = candidates[idx];
        await TransactionRepository.insert({
          accountId:   defaultAccountId,
          date:        c.date,
          amount:      c.amount,
          description: c.description,
          type:        c.type,
          isRecurring: false,
          bankName:    c.bankName,
        });
        count++;
      }
      setImported(prev => prev + count);
      setCandidates([]);
      setSelected(new Set());
      setFileInfo(null);
      await loadByMonth(currentMonth.year, currentMonth.month);
      Alert.alert(
        t('import.doneTitle'),
        count === 1
          ? t('import.doneMessage', { count })
          : t('import.doneMessagePlural', { count }),
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('import.importError'));
    } finally {
      setSaving(false);
    }
  }, [candidates, selected, defaultAccountId, currentMonth, loadByMonth, t]);

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((_, i) => i)));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        onClose={() => navigation.goBack()}
      />

      {candidates.length === 0 ? (
        <View style={styles.empty}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', paddingHorizontal: spacing['2xl'] }}>
              <View style={[styles.iconBg, { backgroundColor: `${colors.primary}12`, borderRadius: borderRadius['2xl'] }]}>
                <Icon name="import" size={48} color={colors.primary} />
              </View>
              <Text style={[typography.styles.headlineSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.xl }]}>
                {t('import.headline')}
              </Text>
              <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
                {t('import.description')}
              </Text>

              {imported > 0 && (
                <View style={[{
                  backgroundColor: `${colors.success}15`,
                  borderRadius: borderRadius.lg,
                  padding: spacing.base,
                  marginTop: spacing.xl,
                  flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                }]}>
                  <Icon name="check-circle" size={20} color={colors.success} />
                  <Text style={[typography.styles.labelLarge, { color: colors.success }]}>
                    {imported === 1
                      ? t('import.importedSession', { count: imported })
                      : t('import.importedSessionPlural', { count: imported })}
                  </Text>
                </View>
              )}

              <AppButton
                label={t('import.selectFile')}
                icon="download"
                variant="primary"
                size="lg"
                onPress={handlePick}
                style={{ marginTop: spacing['2xl'] }}
              />

              <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: spacing.lg, textAlign: 'center' }]}>
                {t('import.hint')}
              </Text>
            </Animated.View>
          )}
        </View>
      ) : (
        <>
          {/* Info do arquivo */}
          <View style={[{
            backgroundColor: colors.header,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.styles.labelLarge, { color: colors.text }]} numberOfLines={1}>
                {fileInfo?.name}
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary }]}>
                {t('import.selectedOf', { selected: selected.size, total: fileInfo?.count })}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={[typography.styles.labelMedium, { color: colors.primary }]}>
                {selected.size === candidates.length ? t('import.deselectAll') : t('import.selectAll')}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={candidates}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: spacing.sm, paddingBottom: bottomPad + 40 }}
            renderItem={({ item, index }) => {
              const sel = selected.has(index);
              return (
                <TouchableOpacity
                  onPress={() => {
                    const next = new Set(selected);
                    if (sel) next.delete(index); else next.add(index);
                    setSelected(next);
                  }}
                  style={[{
                    flexDirection:   'row',
                    alignItems:      'center',
                    backgroundColor: sel ? `${colors.primary}08` : colors.card,
                    borderRadius:    borderRadius.lg,
                    padding:         spacing.md,
                    marginBottom:    spacing.xs,
                    borderWidth:     sel ? 1 : 0,
                    borderColor:     colors.primary,
                    ...shadows.sm,
                  }]}
                >
                  <View style={[{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: item.type === 'income'
                      ? `${colors.income}15` : `${colors.expense}15`,
                    justifyContent: 'center', alignItems: 'center',
                    marginRight: spacing.sm,
                  }]}>
                    <Icon
                      name={item.type === 'income' ? 'income' : 'expense'}
                      size={18}
                      color={item.type === 'income' ? colors.income : colors.expense}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.styles.labelLarge, { color: colors.text }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                      {item.date}{item.bankName ? ` · ${item.bankName}` : ''}
                    </Text>
                  </View>
                  <Text style={[typography.styles.labelLarge, {
                    color: item.amount < 0 ? colors.expense : colors.income,
                    marginLeft: spacing.sm,
                  }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <View style={[{
            position:      'absolute',
            bottom:        Math.max(insets.bottom, 16),
            left:          spacing.base,
            right:         spacing.base,
            flexDirection: 'row',
            gap:           spacing.sm,
          }]}>
            <AppButton
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => { setCandidates([]); setSelected(new Set()); setFileInfo(null); }}
              style={{ flex: 1 }}
            />
            <AppButton
              label={t('import.importCount', { count: selected.size })}
              variant="primary"
              icon="import"
              loading={saving}
              onPress={handleSave}
              style={{ flex: 2 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconBg:    { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
});
