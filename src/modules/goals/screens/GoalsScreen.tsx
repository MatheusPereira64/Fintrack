import React, { useEffect, useCallback, useMemo, useState, memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, Platform, StatusBar,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTheme }     from '../../../hooks/useTheme';
import { useGoalStore } from '../../../store/goalStore';
import { Goal, GoalCategory } from '../../../models/types';
import { formatCurrency }     from '../../../utils/currency';
import { formatDate }         from '../../../utils/date';

const GOAL_CATEGORIES: Array<{ key: GoalCategory; label: string; icon: string }> = [
  { key: 'emergency', label: 'Reserva',     icon: '🛡️' },
  { key: 'travel',    label: 'Viagem',      icon: '✈️' },
  { key: 'purchase',  label: 'Compra',      icon: '🛒' },
  { key: 'education', label: 'Educação',    icon: '📚' },
  { key: 'health',    label: 'Saúde',       icon: '💊' },
  { key: 'custom',    label: 'Personalizado', icon: '🎯' },
];

const COLORS = ['#7C3AED', '#DC2626', '#2563EB', '#16A34A', '#D97706', '#0891B2'];

const GoalCard = memo(function GoalCard({
  goal, onDelete,
}: { goal: Goal; onDelete: (id: number) => void }) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const progress  = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const cat = GOAL_CATEGORIES.find(c => c.key === goal.category);

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <TouchableOpacity
        onLongPress={() => {
          Alert.alert('Excluir meta', `Excluir "${goal.title}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => onDelete(goal.id) },
          ]);
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
            <Text style={{ fontSize: 22 }}>{goal.icon ?? cat?.icon ?? '🎯'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{goal.title}</Text>
            {goal.deadline && (
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                Prazo: {formatDate(goal.deadline, 'short')}
              </Text>
            )}
          </View>
          <Text style={[typography.styles.titleSmall, { color: goal.color }]}>
            {Math.min(progress, 100).toFixed(0)}%
          </Text>
        </View>

        {/* Barra de progresso */}
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
            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary }]}>
            Faltam {formatCurrency(remaining)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export function GoalsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { goals, isLoading, loadGoals, addGoal, deleteGoal, getTotalProgress } = useGoalStore();
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title,    setTitle]    = useState('');
  const [target,   setTarget]   = useState('');
  const [current,  setCurrent]  = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<GoalCategory>('custom');
  const [color,    setColor]    = useState(COLORS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadGoals(); }, []);

  const handleAdd = useCallback(async () => {
    const targetAmt  = parseFloat(target.replace(',', '.'));
    const currentAmt = parseFloat(current.replace(',', '.')) || 0;

    if (!title.trim() || !targetAmt) {
      Alert.alert('Atenção', 'Preencha o nome e o valor da meta.');
      return;
    }
    setSaving(true);
    try {
      await addGoal({ title: title.trim(), targetAmount: targetAmt, currentAmount: currentAmt, deadline: deadline || undefined, category, color });
      setShowModal(false);
      setTitle(''); setTarget(''); setCurrent(''); setDeadline('');
      setCategory('custom'); setColor(COLORS[0]);
    } catch { Alert.alert('Erro', 'Não foi possível criar a meta.'); }
    finally { setSaving(false); }
  }, [title, target, current, deadline, category, color, addGoal]);

  const handleDelete = useCallback((id: number) => { deleteGoal(id); }, [deleteGoal]);

  const totalProgress = getTotalProgress();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: colors.header,
        paddingTop: Math.max(insets.top, 20),
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.base,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      }]}>
        <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>Metas</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}
        >
          <Text style={{ color: '#FFF', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Progress geral */}
      {goals.length > 0 && (
        <View style={[{
          backgroundColor: colors.card, margin: spacing.base,
          borderRadius: borderRadius.xl, padding: spacing.base,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
        }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
            Progresso total das metas
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
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        removeClippedSubviews
        refreshing={isLoading}
        onRefresh={loadGoals}
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl,
            padding: spacing['3xl'], marginTop: spacing['2xl'],
          }]}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>🎯</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              Nenhuma meta ainda
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Defina objetivos financeiros e acompanhe seu progresso.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <GoalCard goal={item} onDelete={handleDelete} />
        )}
      />

      {/* Modal de criar meta */}
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
            }]}
          >
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Nova meta
            </Text>

            {[
              { label: 'Nome da meta *', val: title, setter: setTitle, placeholder: 'Ex: Reserva de emergência' },
              { label: 'Valor alvo (R$) *', val: target, setter: setTarget, placeholder: '0,00', numeric: true },
              { label: 'Valor atual (R$)', val: current, setter: setCurrent, placeholder: '0,00', numeric: true },
              { label: 'Prazo (AAAA-MM-DD)', val: deadline, setter: setDeadline, placeholder: '2025-12-31' },
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

            {/* Cor */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Cor
            </Text>
            <View style={[styles.colorRow, { marginBottom: spacing.md }]}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorDot, {
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: '#FFF',
                    shadowColor: color === c ? c : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4, elevation: color === c ? 4 : 0,
                  }]}
                />
              ))}
            </View>

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.btn, { backgroundColor: colors.surfaceVariant, flex: 1, borderRadius: borderRadius.full }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1, borderRadius: borderRadius.full }]}
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
  container:   { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:      { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  goalHeader:  { flexDirection: 'row', alignItems: 'center' },
  goalIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  goalFooter:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       {},
  empty:       { alignItems: 'center' },
  colorRow:    { flexDirection: 'row', gap: 8 },
  colorDot:    { width: 32, height: 32, borderRadius: 16 },
  btn:         { padding: 12 },
});
