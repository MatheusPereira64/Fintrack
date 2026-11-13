/**
 * Bloqueio do app com biometria ou PIN do aparelho, quando ativado nas
 * configurações. Cobre a tela ao abrir e ao voltar depois de um tempo em
 * segundo plano; o app continua montado por baixo, sem perder o estado.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';
import { DeviceService } from '../services/DeviceService';
import { Logo } from './Logo';
import { Icon } from './Icon';

/** Tempo em segundo plano a partir do qual o app pede desbloqueio de novo. */
export const RELOCK_AFTER_MS = 60_000;

export function AppLock({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const enabled = useSettingsStore(s => s.settings.biometricEnabled && s.settings.onboardingCompleted);
  const [locked, setLocked] = useState(enabled);
  const [authenticating, setAuthenticating] = useState(false);
  const backgroundSince = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    const ok = await DeviceService.authenticate(
      t('lock.promptTitle'), t('lock.promptSubtitle'), t('common.cancel'),
    );
    setAuthenticating(false);
    if (ok) setLocked(false);
  }, [authenticating, t]);

  // Ao ativar o bloqueio nas configurações, não trava o app na hora.
  useEffect(() => {
    if (!enabled) setLocked(false);
  }, [enabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (!enabled) return;
      if (state === 'background') {
        backgroundSince.current = Date.now();
      } else if (state === 'active' && backgroundSince.current !== null) {
        if (Date.now() - backgroundSince.current >= RELOCK_AFTER_MS) setLocked(true);
        backgroundSince.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (locked) void unlock();
    // Pede a digital assim que trava; o botão permite tentar de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  return (
    <View style={styles.root}>
      {children}
      {locked && (
        <View
          style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background, padding: spacing.xl }]}
          accessibilityViewIsModal
        >
          <Logo size={88} />
          <Text style={[typography.styles.headlineSmall, { color: colors.text, marginTop: spacing.xl }]}>
            {t('lock.title')}
          </Text>
          <Text style={[typography.styles.bodyMedium, styles.center, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {t('lock.subtitle')}
          </Text>
          <Pressable
            onPress={unlock}
            disabled={authenticating}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.full,
              marginTop: spacing['2xl'],
              opacity: pressed || authenticating ? 0.8 : 1,
            }]}
          >
            <Icon name="lock" size={20} color={colors.onPrimary} />
            <Text style={[typography.styles.titleMedium, { color: colors.onPrimary, marginLeft: spacing.sm }]}>
              {t('lock.unlock')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  overlay: { alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  center:  { textAlign: 'center' },
  button:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, paddingHorizontal: 32 },
});
