import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { Icon } from '../../../components/Icon';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useReviewStore } from '../../../store/reviewStore';
import { UnrecognizedNotification } from '../../../models/types';
import { UnrecognizedNotificationRepository } from '../../../database/repositories/UnrecognizedNotificationRepository';
import { getBankConfig } from '../services/BankRegistry';
import { formatDate } from '../../../utils/date';

export function UnrecognizedInboxScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const unrecognized = useReviewStore(s => s.unrecognized);
  const isLoading = useReviewStore(s => s.isLoading);
  const loadUnrecognized = useReviewStore(s => s.loadUnrecognized);
  const refreshCounts = useReviewStore(s => s.refreshCounts);

  useFocusEffect(
    useCallback(() => {
      void loadUnrecognized();
    }, [loadUnrecognized]),
  );

  const dismiss = (item: UnrecognizedNotification) => {
    Alert.alert(
      t('unrecognizedInbox.dismissTitle'),
      t('unrecognizedInbox.dismissMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('unrecognizedInbox.dismiss'),
          style: 'destructive',
          onPress: async () => {
            await UnrecognizedNotificationRepository.setStatus(item.id, 'dismissed');
            await loadUnrecognized();
            await refreshCounts();
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: UnrecognizedNotification }) => {
    const bank = getBankConfig(item.packageName)?.name ?? item.packageName;
    return (
      <View style={[{
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        marginBottom: spacing.sm,
        ...shadows.sm,
      }]}>
        <Text style={[typography.styles.titleSmall, { color: colors.text }]} numberOfLines={2}>
          {item.title || t('unrecognizedInbox.noTitle')}
        </Text>
        <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={3}>
          {item.body || t('unrecognizedInbox.noBody')}
        </Text>
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 6 }]}>
          {bank} · {formatDate(item.createdAt, 'relative')}
        </Text>

        <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('TeachPattern', { unrecognizedId: item.id })}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>
              {t('unrecognizedInbox.teach')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => dismiss(item)}
            style={{
              flex: 1,
              backgroundColor: colors.surfaceVariant,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {t('unrecognizedInbox.dismiss')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('unrecognizedInbox.title')}
        onClose={() => navigation.goBack()}
      />

      <FlatList
        data={unrecognized}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadUnrecognized} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }]}>
            <Icon name="bell" size={40} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, {
              color: colors.text, textAlign: 'center', marginTop: spacing.sm,
            }]}>
              {t('unrecognizedInbox.empty')}
            </Text>
            <Text style={[typography.styles.bodySmall, {
              color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs,
            }]}>
              {t('unrecognizedInbox.emptyHint')}
            </Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center' },
});
