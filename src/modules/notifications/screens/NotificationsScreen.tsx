import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { getDatabase } from '../../../database/db';
import { AppNotification } from '../../../models/types';
import { formatDate }      from '../../../utils/date';

export function NotificationsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = async () => {
    const db = await getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
    );
    const rows: AppNotification[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const r = result.rows.item(i);
      rows.push({
        id: r.id, type: r.type, title: r.title,
        message: r.message, read: r.read === 1,
        metadata: r.metadata, createdAt: r.created_at,
      });
    }
    setNotifications(rows);
  };

  const markAllRead = async () => {
    const db = await getDatabase();
    await db.executeSql('UPDATE notifications SET read = 1');
    await load();
  };

  useEffect(() => { load(); }, []);

  const TYPE_ICONS: Record<string, string> = {
    budget_alert:     '⚠️',
    goal_milestone:   '🎯',
    unusual_spending: '🚨',
    transaction_auto: '🤖',
    info:             'ℹ️',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />

      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS === 'android' ? 48 : 56, paddingHorizontal: spacing.base, paddingBottom: spacing.base, ...shadows.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[typography.styles.titleLarge, { color: colors.text }]}>Notificações</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[typography.styles.labelMedium, { color: colors.primary }]}>Lidas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl, padding: spacing.xl }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>🔔</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
              Nenhuma notificação
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[{
            backgroundColor: item.read ? colors.card : `${colors.primary}10`,
            borderRadius: borderRadius.lg,
            padding: spacing.base,
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'flex-start',
            borderLeftWidth: item.read ? 0 : 3,
            borderLeftColor: colors.primary,
            ...shadows.sm,
          }]}>
            <Text style={{ fontSize: 22, marginRight: spacing.sm }}>
              {TYPE_ICONS[item.type] ?? 'ℹ️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                {item.message}
              </Text>
              <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                {formatDate(item.createdAt, 'relative')}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center' },
});
