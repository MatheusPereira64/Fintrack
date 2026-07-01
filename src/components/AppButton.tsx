import React, { memo } from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Icon, AppIconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label:       string;
  onPress:     () => void;
  variant?:    Variant;
  size?:       Size;
  icon?:       AppIconName;
  iconRight?:  AppIconName;
  loading?:    boolean;
  disabled?:   boolean;
  fullWidth?:  boolean;
  style?:      object;
}

export const AppButton = memo(function AppButton({
  label, onPress, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, fullWidth, style,
}: AppButtonProps) {
  const { colors, borderRadius, typography } = useTheme();

  const bg: Record<Variant, string> = {
    primary:   colors.primary,
    secondary: colors.surfaceVariant,
    ghost:     'transparent',
    danger:    colors.error,
  };

  const fg: Record<Variant, string> = {
    primary:   '#FFFFFF',
    secondary: colors.text,
    ghost:     colors.primary,
    danger:    '#FFFFFF',
  };

  const pad: Record<Size, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: 6,  paddingHorizontal: 14 },
    md: { paddingVertical: 11, paddingHorizontal: 20 },
    lg: { paddingVertical: 14, paddingHorizontal: 24 },
  };

  const txtStyle: Record<Size, object> = {
    sm: typography.styles.labelSmall,
    md: typography.styles.labelLarge,
    lg: typography.styles.titleSmall,
  };

  const iconSize: Record<Size, number> = { sm: 14, md: 18, lg: 20 };
  const fgColor = fg[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: bg[variant],
          borderRadius: borderRadius.full,
          ...pad[size],
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? `${colors.primary}40` : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fgColor} />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <Icon name={icon} size={iconSize[size]} color={fgColor} style={{ marginRight: 6 }} />
          )}
          <Text style={[txtStyle[size], { color: fgColor }]}>{label}</Text>
          {iconRight && (
            <Icon name={iconRight} size={iconSize[size]} color={fgColor} style={{ marginLeft: 6 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Ícone circular (botão flutuante / header) ───────────────────────────────
interface IconButtonProps {
  name:     AppIconName;
  onPress:  () => void;
  size?:    number;
  color?:   string;
  bg?:      string;
  badge?:   boolean;
  style?:   object;
}

export const IconButton = memo(function IconButton({
  name, onPress, size = 22, color, bg, badge, style,
}: IconButtonProps) {
  const { colors, borderRadius } = useTheme();
  const iconColor = color ?? colors.text;
  const bgColor   = bg ?? 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.iconBtn,
        { backgroundColor: bgColor, borderRadius: borderRadius.lg },
        style,
      ]}
    >
      <Icon name={name} size={size} color={iconColor} />
      {badge && (
        <View style={[styles.badge, { backgroundColor: colors.error }]} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  base:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  inner:   { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, position: 'relative' },
  badge:   {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
  },
});
