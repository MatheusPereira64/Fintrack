import React, { useEffect, useCallback, useState, memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, Platform, ScrollView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme }     from '../../../hooks/useTheme';
import { useGoalStore } from '../../../store/goalStore';
import { AppHeader }    from '../../../components/AppHeader';
import { CloseButton }  from '../../../components/CloseButton';
import { Icon, AppIconName } from '../../../components/Icon';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { Goal, GoalCategory } from '../../../models/types';
import { formatCurrency }     from '../../../utils/currency';
import { formatDate }         from '../../../utils/date';

interface GoalPreset {
  key: GoalCategory;
  icon: AppIconName;
  color: string;
}

const GOAL_PRESETS: GoalPreset[] = [
  { key: 'house',       icon: 'home-city',  color: '#2563EB' },
  { key: 'wedding',     icon: 'ring',       color: '#EC4899' },
  { key: 'car',         icon: 'car',        color: '#0891B2' },
  { key: 'travel',      icon: 'plane',      color: '#7C3AED' },
  { key: 'emergency',   icon: 'shield',     color: '#16A34A' },
  { key: 'education',   icon: 'education',  color: '#D97706' },
  { key: 'health',      icon: 'health',     color: '#DC2626' },
  { key: 'electronics', icon: 'laptop',     color: '#6366F1' },
  { key: 'purchase',    icon: 'shopping',   color: '#F97316' },
  { key: 'custom',      icon: 'goal',       color: '#7C3AED' },
];

const COLORS = ['#7C3AED', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#0891B2', '#EC4899', '#6366F1'];

function resolveGoalIcon(goal: Goal): AppIconName {
  const fromStored = goal.icon as AppIconName | undefined;
  if (fromStored && GOAL_PRESETS.some(p => p.icon === fromStored)) return fromStored;
  const preset = GOAL_PRESETS.find(c => c.key === goal.category);
  return preset?.icon ?? 'goal';
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

const GoalCard = memo(function GoalCard({
  goal, onDelete,
}: { goal: Goal; onDelete: (id: number) => void }) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const progress  = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const iconName  = resolveGoalIcon(goal);

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <TouchableOpacity
        onLongPress={() => {
          Alert.alert(
            t('goals.deleteGoalTitle'),
            t('goals.deleteGoalMessage', { title: goal.title }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(goal.id) },
            ],
          );
        }}
        activeOpacity={0.8}
        style={[{
          backgroundColor: colors.card,
          borderRadius:    borderRadius.xl,
          padding:         spacing.base,
          marginBottom:    spacing.sm,
          borderLeftWidth: 4,
          borderLeftColor: goal.color,
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 2 },
          shadowOpacity:   0.07,
          shadowRadius:    6,
          elevation:       2,
        }]}
      >
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: `${goal.color}20` }]}>
            <Icon name={iconName} size={22} color={goal.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{goal.title}</Text>
            {goal.deadline && (
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                {t('goals.deadlineText', { date: formatDate(goal.deadline, 'short') })}
              </Text>
            )}
          </View>
          <Text style={[typography.styles.titleSmall, { color: goal.color }]}>
            {Math.min(progress, 100).toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.progressTrack, {
          backgroundColor: colors.surfaceVariant, marginTop: spacing.sm,
        }]}>
          <View style={[styles.progressFill, {
            width:           `${Math.min(progress, 100)}%`,
            backgroundColor: goal.color,
          }]} />
        </View>

        <View style={styles.goalFooter}>
          <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
            {formatCurrency(goal.currentAmount)} {t('goals.of')} {formatCurrency(goal.targetAmount)}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary }]}>
            {t('goals.remaining', { amount: formatCurrency(remaining) })}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export function GoalsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const goals             = useGoalStore(s => s.goals);
  const isLoading         = useGoalStore(s => s.isLoading);
  const loadGoals         = useGoalStore(s => s.loadGoals);
  const addGoal           = useGoalStore(s => s.addGoal);
  const deleteGoal        = useGoalStore(s => s.deleteGoal);
  const getTotalProgress  = useGoalStore(s => s.getTotalProgress);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [title,    setTitle]    = useState('');
  const [target,   setTarget]   = useState('');
  const [current,  setCurrent]  = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<GoalCategory>('custom');
  const [icon,     setIcon]     = useState<AppIconName>('goal');
  const [color,    setColor]    = useState(COLORS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const getDefaultTitle = (key: GoalCategory) =>
    key === 'custom' ? '' : t(`goals.defaultTitles.${key}`);

  const resetForm = () => {
    setTitle(''); setTarget(''); setCurrent(''); setDeadline('');
    setCategory('custom'); setIcon('goal'); setColor(COLORS[0]);
    setShowDatePicker(false);
  };

  const selectPreset = (preset: GoalPreset) => {
    setCategory(preset.key);
    setIcon(preset.icon);
    setColor(preset.color);
    const defaultTitle = getDefaultTitle(preset.key);
    const isPresetTitle = GOAL_PRESETS.some(p => {
      const dt = getDefaultTitle(p.key);
      return dt && dt === title.trim();
    });
    if (!title.trim() || isPresetTitle) {
      if (defaultTitle) setTitle(defaultTitle);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setDeadline(toISODate(selected));
    }
  };

  const handleAdd = useCallback(async () => {
    const targetAmt  = parseFloat(target.replace(',', '.'));
    const currentAmt = parseFloat(current.replace(',', '.')) || 0;

    if (!title.trim() || !targetAmt) {
      Alert.alert(t('common.warning'), t('goals.validationError'));
      return;
    }
    setSaving(true);
    try {
      await addGoal({
        title: title.trim(),
        targetAmount: targetAmt,
        currentAmount: currentAmt,
        deadline: deadline || undefined,
        category,
        icon,
        color,
      });
      setShowModal(false);
      resetForm();
    } catch {
      Alert.alert(t('common.error'), t('goals.createError'));
    } finally {
      setSaving(false);
    }
  }, [title, target, current, deadline, category, icon, color, addGoal, t]);

  const handleDelete = useCallback((id: number) => { deleteGoal(id); }, [deleteGoal]);

  const totalProgress = getTotalProgress();
  const bottomPad = useSafeBottomPadding(24);
  const pickerDate = deadline ? parseISODate(deadline) : new Date();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('goals.title')}
        onClose={() => navigation.goBack()}
        actions={[{
          icon: 'add',
          onPress: () => { resetForm(); setShowModal(true); },
          color: colors.primary,
        }]}
      />

      {goals.length > 0 && (
        <View style={[{
          backgroundColor: colors.card, margin: spacing.base,
          borderRadius: borderRadius.xl, padding: spacing.base,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
        }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            {t('goals.totalProgress')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(totalProgress, 100)}%`,
                  backgroundColor: colors.primary,
                }]} />
              </View>
            </View>
            <Text style={[typography.styles.titleSmall, { color: colors.primary }]}>
              {totalProgress.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={goals}
        keyExtractor={g => String(g.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        removeClippedSubviews
        refreshing={isLoading}
        onRefresh={loadGoals}
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl,
            padding: spacing['3xl'], marginTop: spacing['2xl'],
          }]}>
            <Icon name="goal" size={48} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              {t('goals.noGoals')}
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              {t('goals.noGoalsHint')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <GoalCard goal={item} onDelete={handleDelete} />
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setShowModal(false); resetForm(); }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
                {t('goals.newGoal')}
              </Text>
              <CloseButton onPress={() => { setShowModal(false); resetForm(); }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.md }}
            >
              <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {t('goals.goalType')}
              </Text>
              <View style={[styles.presetGrid, { marginBottom: spacing.lg }]}>
                {GOAL_PRESETS.map(preset => {
                  const sel = category === preset.key;
                  return (
                    <TouchableOpacity
                      key={preset.key}
                      onPress={() => selectPreset(preset)}
                      style={[styles.presetChip, {
                        backgroundColor: sel ? `${preset.color}22` : colors.surfaceVariant,
                        borderColor: sel ? preset.color : 'transparent',
                        borderWidth: sel ? 1.5 : 0,
                        borderRadius: borderRadius.lg,
                      }]}
                    >
                      <Icon name={preset.icon} size={18} color={sel ? preset.color : colors.textSecondary} />
                      <Text
                        style={[typography.styles.caption, {
                          color: sel ? preset.color : colors.textSecondary,
                          marginTop: 4,
                          textAlign: 'center',
                        }]}
                        numberOfLines={1}
                      >
                        {t(`goals.presets.${preset.key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {[
                { label: t('goals.goalName'), val: title, setter: setTitle, placeholder: t('goals.goalNamePlaceholder'), numeric: false },
                { label: t('goals.targetAmount'), val: target, setter: setTarget, placeholder: t('goals.valuePlaceholder'), numeric: true },
                { label: t('goals.currentAmount'), val: current, setter: setCurrent, placeholder: t('goals.valuePlaceholder'), numeric: true },
              ].map((f, i) => (
                <View key={i} style={{ marginBottom: spacing.md }}>
                  <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                    {f.label}
                  </Text>
                  <TextInput
                    value={f.val}
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.placeholder}
                    keyboardType={f.numeric ? 'decimal-pad' : 'default'}
                    style={[{
                      backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg,
                      padding: spacing.md, color: colors.inputText,
                    }, typography.styles.bodyMedium]}
                  />
                </View>
              ))}

              <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {t('goals.deadline')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateBtn, {
                  backgroundColor: colors.inputBackground,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }]}
              >
                <Icon name="calendar" size={20} color={colors.primary} />
                <Text style={[typography.styles.bodyMedium, {
                  color: deadline ? colors.inputText : colors.placeholder,
                  marginLeft: spacing.sm,
                  flex: 1,
                }]}>
                  {deadline ? formatDate(deadline, 'medium') : t('goals.deadlinePlaceholder')}
                </Text>
                {deadline ? (
                  <TouchableOpacity
                    onPress={() => setDeadline('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>

              {showDatePicker && (
                <View style={{ marginBottom: spacing.md }}>
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                    locale="pt-BR"
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

              <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                {t('goals.color')}
              </Text>
              <View style={[styles.colorRow, { marginBottom: spacing.lg }]}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, {
                      backgroundColor: c,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: '#FFF',
                    }]}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              gap: spacing.sm,
              paddingTop: spacing.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderLight,
            }}>
              <TouchableOpacity
                onPress={() => { setShowModal(false); resetForm(); }}
                style={[styles.btn, { backgroundColor: colors.surfaceVariant, flex: 1, borderRadius: borderRadius.full }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1, borderRadius: borderRadius.full }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  {saving ? '...' : t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  goalHeader:  { flexDirection: 'row', alignItems: 'center' },
  goalIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  goalFooter:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       { width: '100%' },
  empty:       { alignItems: 'center' },
  colorRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorDot:    { width: 32, height: 32, borderRadius: 16 },
  btn:         { padding: 12 },
  presetGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip:  { width: '18.5%', minWidth: 64, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  dateBtn:     { flexDirection: 'row', alignItems: 'center' },
});
