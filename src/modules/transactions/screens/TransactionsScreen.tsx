import React, {
  useEffect, useState, useCallback, useMemo,
} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Modal,
  ScrollView, ActivityIndicator,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useTranslation }       from 'react-i18next';

import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useCategoryStore }     from '../../../store/categoryStore';
import { SwipeableTransaction } from '../components/SwipeableTransaction';
import { AppHeader }            from '../../../components/AppHeader';
import { IconButton }           from '../../../components/AppButton';
import { Icon }                 from '../../../components/Icon';
import { CloseButton }          from '../../../components/CloseButton';
import { useTabListPadding }    from '../../../hooks/useScreenPadding';
import type { AppIconName }     from '../../../components/Icon';
import { Transaction }           from '../../../models/types';
import {
  formatMonthYear, subtractMonths, addMonths,
  formatDate, groupByDate,
} from '../../../utils/date';
import { formatCurrency } from '../../../utils/currency';

type FilterType  = 'all' | 'income' | 'expense';
type SortOrder   = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

interface AdvancedFilters {
  categoryId?: number;
  bankName?:   string;
  minAmount?:  number;
  maxAmount?:  number;
}

export function TransactionsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const listPad = useTabListPadding();

  const transactions  = useTransactionStore(s => s.transactions);
  const isLoading     = useTransactionStore(s => s.isLoading);
  const isLoadingMore = useTransactionStore(s => s.isLoadingMore);
  const summary       = useTransactionStore(s => s.summary);
  const currentMonth  = useTransactionStore(s => s.currentMonth);
  const loadByMonth   = useTransactionStore(s => s.loadByMonth);
  const loadMore      = useTransactionStore(s => s.loadMore);
  const hasMore       = useTransactionStore(s => s.hasMore);
  const truncated     = useTransactionStore(s => s.truncated);
  const categories    = useCategoryStore(s => s.categories);
  const loadCategories = useCategoryStore(s => s.loadCategories);

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
    // Primeira carga do mês visível.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Lista virtualizada (header de dia + transação, sem .map interno) ──────
  type ListRow =
    | { kind: 'header'; key: string; date: string }
    | { kind: 'tx'; key: string; tx: Transaction };

  const listRows = useMemo((): ListRow[] => {
    if (sort.startsWith('amount')) {
      return filtered.map(tx => ({ kind: 'tx' as const, key: `tx-${tx.id}`, tx }));
    }
    const grouped = groupByDate(filtered as Array<Transaction & { date: string }>);
    const rows: ListRow[] = [];
    for (const [date, txs] of grouped.entries()) {
      rows.push({ kind: 'header', key: `h-${date}`, date });
      for (const tx of txs as Transaction[]) {
        rows.push({ kind: 'tx', key: `tx-${tx.id}`, tx });
      }
    }
    return rows;
  }, [filtered, sort]);

  const hasActiveFilters = useMemo(() =>
    advanced.categoryId !== undefined ||
    advanced.bankName !== undefined ||
    advanced.minAmount !== undefined ||
    advanced.maxAmount !== undefined,
    [advanced],
  );

  useEffect(() => {
    if ((search.trim() || hasActiveFilters) && hasMore) {
      loadMore();
    }
  }, [search, hasActiveFilters, hasMore, loadMore]);

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

  const TYPE_FILTERS: Array<{ key: FilterType; label: string; icon?: AppIconName; color: string }> = [
    { key: 'all',     label: t('transactions.all'),     color: colors.primary },
    { key: 'income',  label: t('transactions.income'),  icon: 'income',  color: colors.income },
    { key: 'expense', label: t('transactions.expense'), icon: 'expense', color: colors.expense },
  ];

  const SORT_OPTIONS: Array<{ key: SortOrder; label: string }> = [
    { key: 'date_desc',   label: t('transactions.sortNewest') },
    { key: 'date_asc',    label: t('transactions.sortOldest') },
    { key: 'amount_desc', label: t('transactions.sortHighest') },
    { key: 'amount_asc',  label: t('transactions.sortLowest') },
  ];

  const handleEdit = useCallback((tx: Transaction) => {
    navigation.navigate('AddTransaction', { editTransaction: tx });
  }, [navigation]);

  const handlePress = useCallback((tx: Transaction) => {
    navigation.navigate('TransactionDetail', { transactionId: tx.id });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('transactions.title')}
        actions={[
          { icon: 'sort',   onPress: () => setShowSort(true) },
          { icon: 'filter', onPress: () => { setTempCat(advanced.categoryId); setTempBank(advanced.bankName ?? ''); setShowFilters(true); }, badge: hasActiveFilters },
          { icon: 'add',    onPress: () => navigation.navigate('AddTransaction'), color: colors.primary },
        ]}
      />

      {/* ── Barra de ferramentas ───────────────────────────────────────────── */}
      <View style={[styles.toolbar, {
        backgroundColor: colors.header,
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }]}>
        <View style={styles.monthRow}>
          <IconButton name="back" onPress={() => {
            const prev = subtractMonths(currentDate, 1);
            loadByMonth(prev.getFullYear(), prev.getMonth() + 1);
          }} color={colors.primary} />
          <Text
            style={[typography.styles.titleSmall, styles.monthLabel, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {formatMonthYear(currentDate)}
          </Text>
          <IconButton name="forward" onPress={() => {
            const next = addMonths(currentDate, 1);
            if (next <= new Date()) loadByMonth(next.getFullYear(), next.getMonth() + 1);
          }} color={colors.primary} />
        </View>

        <View style={[styles.summaryRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
          {[
            { label: `↑ ${formatCurrency(summary.income)}`,  color: colors.income,   bg: colors.incomeBackground  },
            { label: `↓ ${formatCurrency(summary.expense)}`, color: colors.expense,  bg: colors.expenseBackground },
            { label: `= ${formatCurrency(summary.balance)}`, color: summary.balance >= 0 ? colors.income : colors.expense, bg: summary.balance >= 0 ? colors.incomeBackground : colors.expenseBackground },
          ].map((pill, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: pill.bg, borderRadius: borderRadius.md }]}>
              <Text style={[typography.styles.labelSmall, { color: pill.color }]} numberOfLines={1}>
                {pill.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.searchRow, {
          backgroundColor: colors.inputBackground,
          borderRadius:    borderRadius.lg,
          marginTop:       spacing.sm,
        }]}>
          <Icon name="search" size={16} color={colors.placeholder} style={{ marginLeft: spacing.sm }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('transactions.searchPlaceholder')}
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.inputText, ...typography.styles.bodyMedium }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: spacing.sm }}>
              <Icon name="close" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={[styles.filterRow, { gap: spacing.sm }]}
        >
          {TYPE_FILTERS.map(f => {
            const selected = typeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setTypeFilter(f.key)}
                style={[styles.typeChip, {
                  backgroundColor: selected ? f.color : colors.surfaceVariant,
                  borderRadius: borderRadius.full,
                }]}
              >
                {f.icon ? (
                  <Icon
                    name={f.icon}
                    size={14}
                    color={selected ? '#FFF' : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                ) : null}
                <Text style={[typography.styles.labelMedium, {
                  color: selected ? '#FFF' : colors.textSecondary,
                }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Lista de transações ──────────────────────────────────────────────── */}
      <FlatList
        style={styles.list}
        data={listRows}
        keyExtractor={item => item.key}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ padding: spacing.base, paddingBottom: listPad }}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={8}
        initialNumToRender={12}
        onEndReached={() => { if (hasMore) loadMore(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : truncated ? (
            <Text style={[typography.styles.caption, { color: colors.textTertiary, textAlign: 'center', marginVertical: spacing.sm }]}>
              {t('transactions.showingRecent', { count: transactions.length })}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius:    borderRadius.xl,
            padding:         spacing.xl,
            marginTop:       spacing['3xl'],
          }]}>
            <Icon name="expense" size={40} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.md }]}>
              {search || hasActiveFilters ? t('transactions.noneFound') : t('transactions.noneThisMonth')}
            </Text>
            {(search || hasActiveFilters) && (
              <TouchableOpacity onPress={() => { setSearch(''); clearFilters(); }}>
                <Text style={[typography.styles.labelLarge, { color: colors.primary, textAlign: 'center', marginTop: spacing.sm }]}>
                  {t('transactions.clearFilters')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <Text style={[
                typography.styles.labelLarge,
                { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
              ]}>
                {formatDate(item.date, 'medium')}
              </Text>
            );
          }
          return (
            <SwipeableTransaction
              transaction={item.tx}
              onPress={handlePress}
              onEdit={handleEdit}
            />
          );
        }}
      />

      {/* ── Modal de Ordenação ────────────────────────────────────────────────── */}
      <Modal visible={showSort} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSort(false)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.bottomSheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius:  borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
              paddingBottom: Math.max(insets.bottom, 20),
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
                {t('transactions.sortBy')}
              </Text>
              <CloseButton onPress={() => setShowSort(false)} />
            </View>
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
        </View>
      </Modal>

      {/* ── Modal de Filtros Avançados ───────────────────────────────────────── */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.bottomSheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius:  borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
              paddingBottom: Math.max(insets.bottom, 20),
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text
                style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}
                numberOfLines={1}
              >
                {t('transactions.advancedFilters')}
              </Text>
              <CloseButton onPress={() => setShowFilters(false)} />
            </View>

            {/* Categoria */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('transactions.category')}
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
                  {t('common.all')}
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
                  {t('transactions.bank')}
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
                      {t('transactions.allBanks')}
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
              {t('transactions.amountRange')}
            </Text>
            <View style={[styles.rangeRow, { marginBottom: spacing.xl }]}>
              <TextInput
                value={tempMin}
                onChangeText={setTempMin}
                keyboardType="decimal-pad"
                placeholder={t('transactions.min')}
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
                placeholder={t('transactions.max')}
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
                  {t('common.clear')}
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
                  {t('common.apply')}
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
  container:     { flex: 1 },
  toolbar:       {},
  list:          { flex: 1 },
  monthRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel:    { flex: 1, textAlign: 'center', marginHorizontal: 8 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  pill:          { paddingHorizontal: 10, paddingVertical: 4, maxWidth: '33%' },
  searchRow:     { flexDirection: 'row', alignItems: 'center' },
  searchInput:   { flex: 1, paddingHorizontal: 8, paddingVertical: 10 },
  filterScroll:  { marginTop: 8, flexGrow: 0 },
  filterRow:     { alignItems: 'center', paddingVertical: 2 },
  typeChip:      {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 14,
    paddingVertical:   8,
    alignSelf:         'flex-start',
  },
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
