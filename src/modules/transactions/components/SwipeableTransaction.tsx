import React, { memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated as RNAnimated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme }           from '../../../hooks/useTheme';
import { TransactionItem }    from '../../../components/TransactionItem';
import { Transaction }        from '../../../models/types';
import { useTransactionStore } from '../../../store/transactionStore';

interface SwipeableTransactionProps {
  transaction: Transaction;
  onPress:     (t: Transaction) => void;
  onEdit:      (t: Transaction) => void;
  index?:      number;
}

/**
 * Envolve TransactionItem com ações de swipe:
 * - Arrastar para a esquerda → Excluir (vermelho)
 * - Arrastar para a direita  → Editar (azul)
 */
export const SwipeableTransaction = memo(function SwipeableTransaction({
  transaction, onPress, onEdit, index = 0,
}: SwipeableTransactionProps) {
  const { colors, spacing, borderRadius } = useTheme();
  const deleteTransaction = useTransactionStore(s => s.deleteTransaction);
  const swipeRef = useRef<Swipeable>(null);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Excluir transação',
      `Excluir "${transaction.description}"?`,
      [
        { text: 'Cancelar', onPress: () => swipeRef.current?.close() },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            swipeRef.current?.close();
            await deleteTransaction(transaction.id);
          },
        },
      ],
    );
  }, [transaction, deleteTransaction]);

  const handleEdit = useCallback(() => {
    swipeRef.current?.close();
    onEdit(transaction);
  }, [transaction, onEdit]);

  // ── Ação direita (excluir) ─────────────────────────────────────────────────
  const renderRightActions = useCallback(
    (progress: RNAnimated.AnimatedInterpolation<string | number>) => {
      const translateX = progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [80, 0],
        extrapolate: 'clamp',
      });
      return (
        <RNAnimated.View style={[styles.actionRight, { transform: [{ translateX }] }]}>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionBtn, {
              backgroundColor: colors.expense,
              borderRadius:    borderRadius.lg,
              marginLeft:      4,
            }]}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={styles.actionLabel}>Excluir</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      );
    },
    [handleDelete, colors, borderRadius],
  );

  // ── Ação esquerda (editar) ─────────────────────────────────────────────────
  const renderLeftActions = useCallback(
    (progress: RNAnimated.AnimatedInterpolation<string | number>) => {
      const translateX = progress.interpolate({
        inputRange:  [0, 1],
        outputRange: [-80, 0],
        extrapolate: 'clamp',
      });
      return (
        <RNAnimated.View style={[styles.actionLeft, { transform: [{ translateX }] }]}>
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.actionBtn, {
              backgroundColor: colors.info,
              borderRadius:    borderRadius.lg,
              marginRight:     4,
            }]}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionLabel}>Editar</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      );
    },
    [handleEdit, colors, borderRadius],
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      <TransactionItem
        transaction={transaction}
        onPress={onPress}
        index={index}
      />
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  actionRight: { justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 4 },
  actionLeft:  { justifyContent: 'center', alignItems: 'flex-end',   paddingRight: 4 },
  actionBtn: {
    justifyContent: 'center',
    alignItems:     'center',
    width:          72,
    height:         '100%' as any,
    gap:            2,
  },
  actionIcon:  { fontSize: 18 },
  actionLabel: { color: '#FFF', fontSize: 11, fontWeight: '600' },
});
