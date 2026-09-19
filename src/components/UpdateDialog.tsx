import React, { memo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';
import { useSafeBottomPadding } from '../hooks/useScreenPadding';
import { useUpdateUiStore, UpdateDialogVariant } from '../store/updateUiStore';
import { Icon, AppIconName } from './Icon';
import { AppButton } from './AppButton';
import { CloseButton } from './CloseButton';
import { Logo } from './Logo';

const VARIANT_ICON: Record<UpdateDialogVariant, AppIconName> = {
  update: 'download',
  success: 'check-circle',
  info: 'info',
  error: 'error',
  permission: 'shield',
  progress: 'download',
};

export const UpdateDialog = memo(function UpdateDialog() {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(20);

  const visible = useUpdateUiStore(s => s.visible);
  const variant = useUpdateUiStore(s => s.variant);
  const title = useUpdateUiStore(s => s.title);
  const message = useUpdateUiStore(s => s.message);
  const primaryLabel = useUpdateUiStore(s => s.primaryLabel);
  const secondaryLabel = useUpdateUiStore(s => s.secondaryLabel);
  const showGithub = useUpdateUiStore(s => s.showGithub);
  const githubUrl = useUpdateUiStore(s => s.githubUrl);
  const localVersion = useUpdateUiStore(s => s.localVersion);
  const remoteVersion = useUpdateUiStore(s => s.remoteVersion);
  const dismissible = useUpdateUiStore(s => s.dismissible);
  const progress = useUpdateUiStore(s => s.progress);
  const respond = useUpdateUiStore(s => s.respond);

  const iconColor =
    variant === 'error' ? colors.error
      : variant === 'success' ? colors.success
        : variant === 'permission' ? colors.warning
          : colors.primary;

  const iconBg =
    variant === 'error' ? `${colors.error}20`
      : variant === 'success' ? `${colors.success}20`
        : variant === 'permission' ? `${colors.warning}22`
          : `${colors.primary}18`;

  const pct = progress ?? 0;
  const busy = variant === 'progress';

  const openGithub = () => {
    if (githubUrl) Linking.openURL(githubUrl);
    respond('github');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {
      if (dismissible) respond('dismiss');
    }}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => { if (dismissible) respond('dismiss'); }}
        />
        <View style={[styles.sheet, {
          backgroundColor: colors.card,
          borderTopLeftRadius: borderRadius['2xl'],
          borderTopRightRadius: borderRadius['2xl'],
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: bottomPad,
        }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            {dismissible ? (
              <CloseButton onPress={() => respond('dismiss')} />
            ) : (
              <View style={{ width: 36, height: 36 }} />
            )}
          </View>

          <View style={styles.hero}>
            {variant === 'update' ? (
              <Logo size={64} />
            ) : (
              <View style={[styles.iconCircle, {
                backgroundColor: iconBg,
                borderRadius: borderRadius.full,
              }]}>
                <Icon name={VARIANT_ICON[variant]} size={28} color={iconColor} />
              </View>
            )}
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
              {title}
            </Text>
            <Text style={[typography.styles.bodyMedium, {
              color: colors.textSecondary,
              marginTop: spacing.sm,
              textAlign: 'center',
              lineHeight: 22,
            }]}>
              {message}
            </Text>
          </View>

          {(localVersion || remoteVersion) ? (
            <View style={[styles.versions, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg }]}>
              {localVersion ? (
                <View style={styles.versionCol}>
                  <Text style={[typography.styles.labelSmall, { color: colors.textTertiary }]}>{t('updateDialog.current')}</Text>
                  <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{localVersion}</Text>
                </View>
              ) : null}
              {localVersion && remoteVersion ? (
                <Icon name="forward" size={18} color={colors.primary} />
              ) : null}
              {remoteVersion ? (
                <View style={styles.versionCol}>
                  <Text style={[typography.styles.labelSmall, { color: colors.primary }]}>{t('updateDialog.new')}</Text>
                  <Text style={[typography.styles.titleSmall, { color: colors.primary }]}>{remoteVersion}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {busy ? (
            <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
              <View style={[styles.track, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full }]}>
                <View style={[styles.fill, {
                  width: `${Math.min(100, Math.max(0, pct))}%`,
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.full,
                }]} />
              </View>
              <View style={styles.progressRow}>
                {progress == null || progress === 0 ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary }]}>
                  {progress == null || progress === 0 ? t('updateDialog.preparingDownload') : `${pct}%`}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            {primaryLabel ? (
              <AppButton
                label={primaryLabel}
                onPress={() => respond('primary')}
                fullWidth
                icon={variant === 'update' ? 'download' : undefined}
                disabled={busy}
              />
            ) : null}
            {secondaryLabel ? (
              <AppButton
                label={secondaryLabel}
                onPress={() => respond('secondary')}
                variant="secondary"
                fullWidth
                disabled={busy}
              />
            ) : null}
            {showGithub && githubUrl ? (
              <AppButton
                label={t('updateDialog.viewOnGithub')}
                onPress={openGithub}
                variant="ghost"
                fullWidth
                icon="share"
                disabled={busy}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  handleWrap: { alignItems: 'center', marginBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  hero: { alignItems: 'center', paddingHorizontal: 8 },
  iconCircle: {
    width: 64, height: 64,
    alignItems: 'center', justifyContent: 'center',
  },
  versions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 8,
  },
  versionCol: { alignItems: 'center', flex: 1 },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
});
