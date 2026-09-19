import React, { memo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

interface CloseButtonProps {
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/** Botão X padrão para fechar telas/modais sobrepostos. */
export const CloseButton = memo(function CloseButton({
  onPress,
  size = 22,
  style,
  accessibilityLabel,
}: CloseButtonProps) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('closeButton.accessibilityLabel')}
      hitSlop={12}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: `${colors.textSecondary}18`,
          borderRadius: borderRadius.full,
          padding: spacing.xs,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon name="close" size={size} color={colors.text} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
