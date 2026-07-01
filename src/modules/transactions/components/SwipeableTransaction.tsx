import React, { memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme }           from '../../../hooks/useTheme';
import { TransactionItem }    from '../../../components/TransactionItem';
import { Icon }               from '../../../components/Icon';
import { Transaction }        from '../../../models/types';
import { useTransactionStore } from '../../../store/transactionStore';

const ACTION_WIDTH = 72;
const ROW_HEIGHT   = 68;

interface SwipeableTransactionProps {
  transaction: Transaction;
  onPress:     (t: Transaction) => void;
  onEdit:      (t: Transaction) => void;
  index?:      number;
}

export const SwipeableTransaction = memo(function SwipeableTransaction({
  transaction, onPress, onEdit, index = 0,
}: SwipeableTransactionProps) {
  const { colors, borderRadius } = useTheme();
  const deleteTransaction = useTransactionStore(s => s.deleteTransaction);
  const swipeRef = useRef<SwipeableMethods>(null);

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

  const renderRightActions = useCallback(() => (
    <View style={styles.actionRight}>
      <TouchableOpacity
        onPress={handleDelete}
        style={[styles.actionBtn, { backgroundColor: colors.expense }]}
      >
        <Icon name="delete" size={20} color="#FFF" />
        <Text style={styles.actionLabel}>Excluir</Text>
      </TouchableOpacity>
    </View>
  ), [handleDelete, colors.expense]);

  const renderLeftActions = useCallback(() => (
    <View style={styles.actionLeft}>
      <TouchableOpacity
        onPress={handleEdit}
        style={[styles.actionBtn, { backgroundColor: colors.info }]}
      >
        <Icon name="edit" size={20} color="#FFF" />
        <Text style={styles.actionLabel}>Editar</Text>
      </TouchableOpacity>
    </View>
  ), [handleEdit, colors.info]);

  return (
    <View style={styles.wrapper}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        containerStyle={[styles.swipeContainer, { borderRadius: borderRadius.lg }]}
        childrenContainerStyle={styles.childrenContainer}
      >
        <TransactionItem
          transaction={transaction}
          onPress={onPress}
          index={index}
        />
      </Swipeable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
    overflow:     'hidden',
    borderRadius: 12,
  },
  swipeContainer: {
    overflow: 'hidden',
  },
  childrenContainer: {
    backgroundColor: 'transparent',
  },
  actionRight: {
    width:          ACTION_WIDTH,
    justifyContent: 'center',
    alignItems:     'center',
  },
  actionLeft: {
    width:          ACTION_WIDTH,
    justifyContent: 'center',
    alignItems:     'center',
  },
  actionBtn: {
    width:          ACTION_WIDTH,
    height:         ROW_HEIGHT,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            2,
  },
  actionLabel: { color: '#FFF', fontSize: 11, fontWeight: '600' },
});
