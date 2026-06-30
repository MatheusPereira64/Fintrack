import React, {
  useEffect, useState, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Platform, StatusBar, Modal,
  ScrollView, Dimensions,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';

import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useCategoryStore }     from '../../../store/categoryStore';
import { SwipeableTransaction } from '../components/SwipeableTransaction';
import { Transaction }           from '../../../models/types';
import {
  formatMonthYear, subtractMonths, addMonths,
  formatDate, groupByDate,
} from '../../../utils/date';
import { formatCurrency } from '../../../utils/currency';

const { width } = Dimensions.get('window');

type FilterType  = 'all' | 'income' | 'expense';
type SortOrder   = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

interface AdvancedFilters {
  categoryId?: number;
  bankName?:   string;
  minAmount?:  number;
  maxAmount?:  number;
}

const SORT_OPTIONS: Array<{ key: SortOrder; label: string }> = [
  { key: 'date_desc',   label: 'Mais recentes' },
  { key: 'date_asc',    label: 'Mais antigas'  },
  { key: 'amount_desc', label: 'Maior valor'   },
  { key: 'amount_asc',  label: 'Menor valor'   },
];

export function TransactionsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

  const {
    transactions, isLoading, summary, currentMonth,
    loadByMonth,
  } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();

  // ── Estado dos filtros ─────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [sort,      setSort]      = useState<SortOrder>('date_desc');
  const [advanced,  setAdvanced]  = useState<AdvancedFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSort,    setShowSort]    = useState(false);

  // Temp state do modal de filtros
  const [tempCat,    setTempCat]    = useState<number | undefined>();
  const [tempBank,   setTempBank]   = useState('');
  const [tempMin,    setTempMin]    = useState('');
  const [tempMax,    setTempMax]    = useState('');

  const currentDate = useMemo(
    () => new Date(currentMonth.year, currentMonth.month - 1, 1),
    [currentMonth],
  );

  useEffect(() => {
    loadByMonth(currentMonth.year, currentMonth.month);
    loadCategories();
  }, []);

  const onRefresh = useCallback(() => {
    loadByMonth(currentMonth.year, currentMonth.month);
  }, [currentMonth, loadByMonth]);

  // ── Bancos únicos nas transações ───────────────────────────────────────────
  const uniqueBanks = useMemo(() => {
    const banks = new Set(transactions.map(t => t.bankName).filter(Boolean) as string[]);
    return Array.from(banks).sort();
  }, [transactions]);

  // ── Filtragem e ordenação ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...transactions];

    // Tipo
    if (typeFilter === 'income')  list = list.filter(t => t.amount > 0);
    if (typeFilter === 'expense') list = list.filter(t => t.amount < 0);

    // Busca textual
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.bankName?.toLowerCase().includes(q) ?? false),
      );
    }

    // Filtros avançados
    if (advanced.categoryId) list = list.filter(t => t.categoryId === advanced.categoryId);
    if (advanced.bankName)   list = list.filter(t => t.bankName === advanced.bankName);
    if (advanced.minAmount !== undefined) list = list.filter(t => Math.abs(t.amount) >= advanced.minAmount!);
    if (advanced.maxAmount !== undefined) list = list.filter(t => Math.abs(t.amount) <= advanced.maxAmount!);

    // Ordenação
    list.sort((a, b) => {
      switch (sort) {
        case 'date_asc':    return a.date.localeCompare(b.date);
        case 'amount_desc': return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount_asc':  return Math.abs(a.amount) - Math.abs(b.amount);
        default:            return b.date.localeCompare(a.date) || b.id - a.id;
      }
    });

    return list;
  }, [transactions, typeFilter, search, advanced, sort]);

  // ── Agrupamento por data (apenas para ordenação por data) ─────────────────
  const sections = useMemo(() => {
    if (sort.startsWith('amount')) {
      return [{ date: '', txs: filtered }];
    }
    const grouped = groupByDate(filtered as Array<Transaction & { date: string }>);
    return Array.from(grouped.entries()).map(([date, txs]) => ({ date, txs: txs as Transaction[] }));
  }, [filtered, sort]);

  const hasActiveFilters = useMemo(() =>
    advanced.categoryId !== undefined ||
    advanced.bankName !== undefined ||
    advanced.minAmount !== undefined ||
    advanced.maxAmount !== undefined,
    [advanced],
  );

  const applyAdvancedFilters = () => {
    setAdvanced({
      categoryId: tempCat,
      bankName:   tempBank || undefined,
      minAmount:  tempMin ? parseFloat(tempMin.replace(',', '.')) : undefined,
      maxAmount:  tempMax ? parseFloat(tempMax.replace(',', '.')) : undefined,
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setAdvanced({}); setTempCat(undefined);
    setTempBank(''); setTempMin(''); setTempMax('');
    setShowFilters(false);
  };

  const TYPE_FILTERS: Array<{ key: FilterType; label: string; color: string }> = [
    { key: 'all',     label: 'Todas',    color: colors.primary },
    { key: 'income',  label: '📥 Receitas', color: colors.income },
    { key: 'expense', label: '📤 Despesas', color: colors.expense },
  ];

  const handleEdit = useCallback((tx: Transaction) => {
    navigation.navigate('AddTransaction', { editTransaction: tx });
  }, [navigation]);

  const handlePress = useCallback((tx: Transaction) => {
    navigation.navigate('TransactionDetail', { transactionId: tx.id });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.header}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, {
        backgroundColor:  colors.header,
        paddingTop:       Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: spacing.base,
        paddingBottom:    spacing.base,
        ...shadows.sm,
      }]}>
        {/* Título + botão adicionar */}
        <View style={styles.headerRow}>
          <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>
            Transações
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowSort(true)}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md }]}
            >
              <Text style={{ fontSize: 16 }}>⇅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setTempCat(advanced.categoryId); setTempBank(advanced.bankName ?? ''); setShowFilters(true); }}
              style={[styles.iconBtn, {
                backgroundColor: hasActiveFilters ? `${colors.primary}20` : colors.surfaceVariant,
                borderRadius:    borderRadius.md,
                borderWidth:     hasActiveFilters ? 1 : 0,
                borderColor:     colors.primary,
              }]}
            >
              <Text style={{ fontSize: 16 }}>🔧</Text>
              {hasActiveFilters && (
                <View style={[styles.filterDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction')}
              style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}
            >
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seletor de mês */}
        <View style={[styles.monthRow, { marginBottom: spacing.sm }]}>
          <TouchableOpacity onPress={() => {
            const prev = subtractMonths(currentDate, 1);
            loadByMonth(prev.getFullYear(), prev.getMonth() + 1);
          }} style={styles.monthArrow}>
            <Text style={{ color: colors.primary, fontSize: 22 }}>‹</Text>
          </TouchableOpacity>
          <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
            {formatMonthYear(currentDate)}
          </Text>
          <TouchableOpacity onPress={() => {
            const next = addMonths(currentDate, 1);
            if (next <= new Date()) loadByMonth(next.getFullYear(), next.getMonth() + 1);
          }} style={styles.monthArrow}>
            <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Pills de resumo */}
        <View style={[styles.summaryRow, { gap: spacing.sm }]}>
          {[
            { label: `↑ ${formatCurrency(summary.income)}`,  color: colors.income,   bg: colors.incomeBackground  },
            { label: `↓ ${formatCurrency(summary.expense)}`, color: colors.expense,  bg: colors.expenseBackground },
            { label: `= ${formatCurrency(summary.balance)}`, color: summary.balance >= 0 ? colors.income : colors.expense, bg: summary.balance >= 0 ? colors.incomeBackground : colors.expenseBackground },
          ].map((pill, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: pill.bg, borderRadius: borderRadius.md }]}>
              <Text style={[typography.styles.labelSmall, { color: pill.color }]}>{pill.label}</Text>
            </View>
          ))}
        </View>

        {/* Busca */}
        <View style={[styles.searchRow, {
          backgroundColor: colors.inputBackground,
          borderRadius:    borderRadius.lg,
          marginTop:       spacing.sm,
        }]}>
          <Text style={{ fontSize: 14, marginLeft: spacing.sm }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar transação ou banco..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.inputText, ...typography.styles.bodyMedium }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: spacing.sm }}>
              <Text style={{ color: colors.textTertiary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de tipo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          {TYPE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTypeFilter(f.key)}
              style={[styles.typeChip, {
                backgroundColor: typeFilter === f.key ? f.color : colors.surfaceVariant,
                borderRadius: borderRadius.full,
                marginRight: spacing.sm,
              }]}
            >
              <Text style={[typography.styles.labelMedium, {
                color: typeFilter === f.key ? '#FFF' : colors.textSecondary,
              }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Lista de transações ──────────────────────────────────────────────── */}
      <FlatList
        data={sections}
        keyExtractor={(item, idx) => item.date || String(idx)}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius:    borderRadius.xl,
            padding:         spacing.xl,
            marginTop:       spacing['3xl'],
          }]}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>💸</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              {search || hasActiveFilters ? 'Nenhuma transação encontrada' : 'Sem transações neste mês'}
            </Text>
            {(search || hasActiveFilters) && (
              <TouchableOpacity onPress={() => { setSearch(''); clearFilters(); }}>
                <Text style={[typography.styles.labelLarge, { color: colors.primary, textAlign: 'center', marginTop: spacing.sm }]}>
                  Limpar filtros
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item: section }) => (
          <View>
            {section.date ? (
              <Text style={[
                typography.styles.labelLarge,
                { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
              ]}>
                {formatDate(section.date, 'medium')}
              </Text>
            ) : null}
            {(section.txs as Transaction[]).map((tx, idx) => (
              <SwipeableTransaction
                key={tx.id}
                transaction={tx}
                onPress={handlePress}
                onEdit={handleEdit}
                index={idx}
              />
            ))}
          </View>
        )}
      />

      {/* ── Modal de Ordenação ────────────────────────────────────────────────── */}
      <Modal visible={showSort} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowSort(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.bottomSheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius:  borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
            }]}
          >
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Ordenar por
            </Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setSort(opt.key); setShowSort(false); }}
                style={[styles.sortOption, {
                  backgroundColor: sort === opt.key ? `${colors.primary}15` : 'transparent',
                  borderRadius:    borderRadius.lg,
                  padding:         spacing.md,
                  marginBottom:    spacing.xs,
                }]}
              >
                <Text style={[typography.styles.bodyLarge, { color: sort === opt.key ? colors.primary : colors.text }]}>
                  {sort === opt.key ? '✓ ' : ''}{opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de Filtros Avançados ───────────────────────────────────────── */}
      <Modal visible={showFilters} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.bottomSheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius:  borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
            }]}
          >
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Filtros avançados
            </Text>

            {/* Categoria */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Categoria
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={() => setTempCat(undefined)}
                style={[styles.filterChip, {
                  backgroundColor: tempCat === undefined ? colors.primary : colors.surfaceVariant,
                  borderRadius: borderRadius.full,
                  marginRight: spacing.sm,
                }]}
              >
                <Text style={[typography.styles.labelMedium, { color: tempCat === undefined ? '#FFF' : colors.textSecondary }]}>
                  Todas
                </Text>
              </TouchableOpacity>
              {categories.slice(0, 12).map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setTempCat(c.id)}
                  style={[styles.filterChip, {
                    backgroundColor: tempCat === c.id ? colors.primary : colors.surfaceVariant,
                    borderRadius: borderRadius.full,
                    marginRight: spacing.sm,
                  }]}
                >
                  <Text style={{ fontSize: 13 }}>{c.icon ?? '📦'}</Text>
                  <Text style={[typography.styles.labelSmall, {
                    color: tempCat === c.id ? '#FFF' : colors.textSecondary,
                  }]}>
                    {' '}{c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Banco */}
            {uniqueBanks.length > 0 && (
              <>
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                  Banco
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  <TouchableOpacity
                    onPress={() => setTempBank('')}
                    style={[styles.filterChip, {
                      backgroundColor: !tempBank ? colors.primary : colors.surfaceVariant,
                      borderRadius: borderRadius.full, marginRight: spacing.sm,
                    }]}
                  >
                    <Text style={[typography.styles.labelMedium, { color: !tempBank ? '#FFF' : colors.textSecondary }]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {uniqueBanks.map(bank => (
                    <TouchableOpacity
                      key={bank}
                      onPress={() => setTempBank(bank)}
                      style={[styles.filterChip, {
                        backgroundColor: tempBank === bank ? colors.primary : colors.surfaceVariant,
                        borderRadius: borderRadius.full, marginRight: spacing.sm,
                      }]}
                    >
                      <Text style={[typography.styles.labelMedium, {
                        color: tempBank === bank ? '#FFF' : colors.textSecondary,
                      }]}>
                        {bank}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Faixa de valor */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Faixa de valor
            </Text>
            <View style={[styles.rangeRow, { marginBottom: spacing.xl }]}>
              <TextInput
                value={tempMin}
                onChangeText={setTempMin}
                keyboardType="decimal-pad"
                placeholder="Mínimo"
                placeholderTextColor={colors.placeholder}
                style={[styles.rangeInput, {
                  backgroundColor: colors.inputBackground,
                  borderRadius:    borderRadius.lg,
                  color:           colors.inputText,
                  flex: 1,
                }]}
              />
              <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.sm }}>–</Text>
              <TextInput
                value={tempMax}
                onChangeText={setTempMax}
                keyboardType="decimal-pad"
                placeholder="Máximo"
                placeholderTextColor={colors.placeholder}
                style={[styles.rangeInput, {
                  backgroundColor: colors.inputBackground,
                  borderRadius:    borderRadius.lg,
                  color:           colors.inputText,
                  flex: 1,
                }]}
              />
            </View>

            {/* Ações */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                onPress={clearFilters}
                style={[styles.filterBtn, {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius:    borderRadius.full, flex: 1,
                }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
                  Limpar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyAdvancedFilters}
                style={[styles.filterBtn, {
                  backgroundColor: colors.primary,
                  borderRadius:    borderRadius.full, flex: 1,
                }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  Aplicar
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
  container:     { flex: 1 },
  header:        {},
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:       { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  filterDot:     { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3 },
  addBtn:        { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  monthRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  monthArrow:    { padding: 4 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'center' },
  pill:          { paddingHorizontal: 10, paddingVertical: 4 },
  searchRow:     { flexDirection: 'row', alignItems: 'center' },
  searchInput:   { flex: 1, paddingHorizontal: 8, paddingVertical: 10 },
  typeChip:      { paddingHorizontal: 12, paddingVertical: 6 },
  empty:         { alignItems: 'center' },
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  bottomSheet:   {},
  sortOption:    {},
  filterChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  rangeRow:      { flexDirection: 'row', alignItems: 'center' },
  rangeInput:    { padding: 12 },
  filterActions: { flexDirection: 'row', gap: 8 },
  filterBtn:     { padding: 12 },
});
