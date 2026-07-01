/**
 * Header padrão para todas as telas.
 * Substitui os headers inline de cada tela, garantindo consistência.
 */
import React, { memo } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { AppIconName } from './Icon';
import { IconButton } from './AppButton';

interface HeaderAction {
  icon:   AppIconName;
  onPress: () => void;
  badge?: boolean;
  color?: string;
}

interface AppHeaderProps {
  title:       string;
  subtitle?:   string;
  onBack?:     () => void;
  actions?:    HeaderAction[];
  transparent?: boolean;
  right?:      React.ReactNode;
}

export const AppHeader = memo(function AppHeader({
  title, subtitle, onBack, actions, transparent, right,
}: AppHeaderProps) {
  const { colors, spacing, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 20);

  const bg = transparent ? 'transparent' : colors.header;

  return (
    <>
      <StatusBar
        barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'}
        backgroundColor={bg === 'transparent' ? 'transparent' : bg}
        translucent={transparent}
      />
      <View
        style={[
          styles.container,
          {
            backgroundColor: bg,
            paddingTop: paddingTop + 4,
            paddingHorizontal: spacing.base,
            paddingBottom: spacing.md,
          },
          !transparent && shadows.sm,
          !transparent && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          {/* Botão voltar */}
          {onBack && (
            <IconButton
              name="back"
              onPress={onBack}
              size={22}
              color={colors.text}
              style={{ marginRight: spacing.xs }}
            />
          )}

          {/* Título */}
          <View style={styles.titleGroup}>
            <Text style={[typography.styles.titleLarge, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[typography.styles.labelSmall, { color: colors.primary }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Ações / Right slot */}
          <View style={styles.actions}>
            {right}
            {actions?.map((a, i) => (
              <IconButton
                key={i}
                name={a.icon}
                onPress={a.onPress}
                badge={a.badge}
                color={a.color ?? colors.textSecondary}
                size={22}
              />
            ))}
          </View>
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection:  'row',
    alignItems:     'center',
  },
  titleGroup: {
    flex:        1,
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
});
