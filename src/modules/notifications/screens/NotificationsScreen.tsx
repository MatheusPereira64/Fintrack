import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { useTheme }   from '../../../hooks/useTheme';
import { AppHeader }  from '../../../components/AppHeader';
import { AppButton }  from '../../../components/AppButton';
import { Icon }       from '../../../components/Icon';
import { getDatabase } from '../../../database/db';
import { AppNotification } from '../../../models/types';
import { formatDate }      from '../../../utils/date';

export function NotificationsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const insets = useSafeAreaInsets();
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

  const TYPE_ICONS = {
    budget_alert:     'warning',
    goal_milestone:   'goal',
    unusual_spending: 'error',
    transaction_auto: 'auto',
    info:             'info',
  } as const;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Notificações"
        onBack={() => navigation.goBack()}
        actions={[{ icon: 'check-circle', onPress: markAllRead }]}
      />

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl, padding: spacing.xl }]}>
            <Icon name="bell" size={40} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
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
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm }}>
              <Icon name={(TYPE_ICONS as any)[item.type] ?? 'info'} size={18} color={colors.primary} />
            </View>
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
