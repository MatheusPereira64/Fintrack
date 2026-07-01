import React, { useEffect, useCallback, useState, memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, Platform, StatusBar, ScrollView,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTheme }       from '../../../hooks/useTheme';
import { useBudgetStore } from '../../../store/budgetStore';
import { useCategoryStore } from '../../../store/categoryStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { formatCurrency, formatPercent } from '../../../utils/currency';

const BudgetCard = memo(function BudgetCard({
  budget, onDelete,
}: { budget: any; onDelete: (id: number) => void }) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const overBudget = percent > 100;
  const nearLimit  = percent > 80;

  const barColor = overBudget ? colors.error : nearLimit ? colors.warning : colors.success;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <TouchableOpacity
        onLongPress={() => Alert.alert('Excluir orçamento', 'Deseja remover este orçamento?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: () => onDelete(budget.id) },
        ])}
        activeOpacity={0.8}
        style={[{
          backgroundColor: colors.card,
          borderRadius:    borderRadius.xl,
          padding:         spacing.base,
          marginBottom:    spacing.sm,
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 2 },
          shadowOpacity:   0.07,
          shadowRadius:    6,
          elevation:       2,
        }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${budget.categoryColor ?? colors.primary}20` }]}>
            <Text style={{ fontSize: 20 }}>{budget.categoryIcon ?? '📊'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
              {budget.categoryName ?? 'Todas as categorias'}
            </Text>
            <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
              {formatCurrency(budget.spent)} de {formatCurrency(budget.amount)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[typography.styles.titleSmall, {
              color: overBudget ? colors.error : nearLimit ? colors.warning : colors.text,
            }]}>
              {formatPercent(Math.min(percent, 100))}
            </Text>
            {overBudget && (
              <Text style={[typography.styles.caption, { color: colors.error }]}>
                Excedido!
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.progressTrack, {
          backgroundColor: colors.surfaceVariant, marginTop: spacing.sm,
        }]}>
          <View style={[styles.progressFill, {
            width:           `${Math.min(percent, 100)}%`,
            backgroundColor: barColor,
          }]} />
        </View>

        <Text style={[typography.styles.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {overBudget
            ? `Excedeu em ${formatCurrency(budget.spent - budget.amount)}`
            : `Restam ${formatCurrency(budget.amount - budget.spent)}`}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export function BudgetScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { budgets, isLoading, loadBudgets, addBudget, deleteBudget, syncSpent } = useBudgetStore();
  const { categories, loadCategories } = useCategoryStore();
  const { currentMonth } = useTransactionStore();

  const [showModal, setShowModal] = useState(false);
  const [amount,    setAmount]    = useState('');
  const [catId,     setCatId]     = useState<number | undefined>();
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const init = async () => {
      await loadBudgets();
      await syncSpent(currentMonth.year, currentMonth.month);
    };
    init();
  }, [currentMonth]);

  const handleAdd = useCallback(async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido para o orçamento.');
      return;
    }
    setSaving(true);
    try {
      await addBudget({
        categoryId: catId,
        amount:     amt,
        period:     'monthly',
        startDate:  new Date().toISOString().slice(0, 10),
      });
      await syncSpent(currentMonth.year, currentMonth.month);
      setShowModal(false);
      setAmount('');
      setCatId(undefined);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o orçamento.');
    } finally {
      setSaving(false);
    }
  }, [amount, catId, addBudget, syncSpent, currentMonth]);

  const handleDelete = useCallback((id: number) => { deleteBudget(id); }, [deleteBudget]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      <View style={[styles.header, {
        backgroundColor: colors.header,
        paddingTop: Math.max(insets.top, 20),
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }]}>
        <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>Orçamentos</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}
        >
          <Text style={{ color: '#FFF', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        refreshing={isLoading}
        onRefresh={loadBudgets}
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing['3xl'],
            marginTop: spacing['2xl'],
          }]}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>📊</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              Nenhum orçamento ainda
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
              Defina limites de gastos por categoria.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BudgetCard budget={item} onDelete={handleDelete} />
        )}
      />

      {/* Modal de criar orçamento */}
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
              Novo orçamento mensal
            </Text>

            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Valor limite (R$) *
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={colors.placeholder}
              style={[{
                backgroundColor: colors.inputBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                color: colors.inputText,
                marginBottom: spacing.lg,
              }, typography.styles.bodyLarge]}
            />

            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Categoria (opcional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl }}>
              <TouchableOpacity
                onPress={() => setCatId(undefined)}
                style={[styles.catChip, {
                  backgroundColor: !catId ? colors.primary : colors.surfaceVariant,
                  borderRadius: borderRadius.full, marginRight: spacing.sm,
                }]}
              >
                <Text style={[typography.styles.labelMedium, { color: !catId ? '#FFF' : colors.textSecondary }]}>
                  Geral
                </Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[styles.catChip, {
                    backgroundColor: catId === c.id ? colors.primary : colors.surfaceVariant,
                    borderRadius: borderRadius.full, marginRight: spacing.sm,
                  }]}
                >
                  <Text style={{ fontSize: 14 }}>{c.icon ?? '📦'}</Text>
                  <Text style={[typography.styles.labelSmall, {
                    color: catId === c.id ? '#FFF' : colors.textSecondary, marginLeft: 4,
                  }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
  cardHeader:  { flexDirection: 'row', alignItems: 'center' },
  iconWrap:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  sheet:       {},
  empty:       { alignItems: 'center' },
  catChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  btn:         { padding: 12 },
});
