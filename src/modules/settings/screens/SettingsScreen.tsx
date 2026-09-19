import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme }          from '../../../hooks/useTheme';
import { useSettingsStore }  from '../../../store/settingsStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore }   from '../../../store/accountStore';
import { ExportService }     from '../../../services/ExportService';
import { Logger }            from '../../../services/LoggerService';
import { getDatabase }       from '../../../database/db';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';
import { Icon, AppIconName } from '../../../components/Icon';
import { AppHeader } from '../../../components/AppHeader';
import { CloseButton } from '../../../components/CloseButton';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { UpdateService, RELEASES_PAGE } from '../../../services/UpdateService';

import { Share, NativeModules, Linking, ActivityIndicator } from 'react-native';

type ThemeOption = 'light' | 'dark' | 'system';
type LanguageOption = 'pt-BR' | 'en-US';

interface SettingsGroupProps {
  title:    string;
  children: React.ReactNode;
}

function SettingsGroup({ title, children }: SettingsGroupProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={[
        typography.styles.labelLarge,
        { color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
      ]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

interface SettingsRowProps {
  icon:       AppIconName;
  title:      string;
  subtitle?:  string;
  onPress?:   () => void;
  right?:     React.ReactNode;
  isDestructive?: boolean;
  disabled?:  boolean;
  first?:     boolean;
  last?:      boolean;
}

function SettingsRow({
  icon, title, subtitle, onPress, right, isDestructive, disabled, first, last,
}: SettingsRowProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      style={[{
        backgroundColor: colors.card,
        borderTopLeftRadius:     first ? borderRadius.lg : 0,
        borderTopRightRadius:    first ? borderRadius.lg : 0,
        borderBottomLeftRadius:  last  ? borderRadius.lg : 0,
        borderBottomRightRadius: last  ? borderRadius.lg : 0,
        paddingHorizontal:   spacing.base,
        paddingVertical:     spacing.md,
        flexDirection:       'row',
        alignItems:          'center',
        borderBottomWidth:   last ? 0 : 1,
        borderBottomColor:   colors.borderLight,
        opacity:             disabled ? 0.5 : 1,
      }]}
    >
      <View style={[{
        width: 32, height: 32, borderRadius: borderRadius.md,
        backgroundColor: isDestructive ? `${colors.error}20` : `${colors.primary}15`,
        justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
      }]}>
        <Icon
          name={icon}
          size={16}
          color={isDestructive ? colors.error : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.styles.bodyLarge, {
          color: isDestructive ? colors.error : colors.text,
        }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 1 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress && !disabled && (
        <Icon name="forward" size={18} color={colors.textTertiary} />
      ))}
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const settings = useSettingsStore(s => s.settings);
  const setTheme = useSettingsStore(s => s.setTheme);
  const setLanguage = useSettingsStore(s => s.setLanguage);
  const txCount = useTransactionStore(s => s.summary.count);
  const accounts = useAccountStore(s => s.accounts);

  const [isExporting, setIsExporting] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLangModal, setShowLangModal]   = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.2');
  const bottomPad = useSafeBottomPadding(24);

  useEffect(() => {
    UpdateService.getLocalVersion()
      .then(v => setAppVersion(`${v.versionName} (${v.versionCode})`))
      .catch(() => {});
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      await UpdateService.checkFromSettings(pct => setUpdateProgress(pct));
    } finally {
      setCheckingUpdate(false);
      setUpdateProgress(null);
    }
  }, []);
  const handleCheckPermission = useCallback(async () => {
    try {
      const mod = NativeModules.NotificationModule;
      if (mod?.openNotificationSettings) {
        await mod.openNotificationSettings();
      } else {
        Alert.alert(t('common.info'), t('settings.notificationSettingsHint'));
      }
    } catch {
      Alert.alert(t('common.info'), t('settings.notificationSettingsHint'));
    }
  }, [t]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const txs = await TransactionRepository.findAll(2000, 0);
      const csv = ExportService.toCSV(txs, accounts);
      await Share.share({
        title:   `FinTrack_${new Date().toISOString().split('T')[0]}.csv`,
        message: csv,
      });
      Logger.info('Settings', 'Exportação CSV concluída', { count: txs.length });
    } catch {
      Alert.alert(t('common.error'), t('settings.exportCsvError'));
    } finally {
      setIsExporting(false);
    }
  }, [accounts, t]);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const txs = await TransactionRepository.findAll(2000, 0);
      const json = ExportService.toJSON(txs, accounts);
      await Share.share({
        title:   `FinTrack_${new Date().toISOString().split('T')[0]}.json`,
        message: json,
      });
    } catch {
      Alert.alert(t('common.error'), t('settings.exportJsonError'));
    } finally {
      setIsExporting(false);
    }
  }, [accounts, t]);

  const handleResetData = useCallback(() => {
    Alert.alert(
      t('settings.resetTitle'),
      t('settings.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text:  t('settings.resetAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.executeSql('DELETE FROM transactions');
              await db.executeSql('DELETE FROM accounts');
              await db.executeSql('DELETE FROM goals');
              await db.executeSql('DELETE FROM budgets');
              await db.executeSql('DELETE FROM notifications');
              await db.executeSql('DELETE FROM logs');
              await db.executeSql(`UPDATE user_settings SET
                onboarding_completed = 0, notification_permission = 0,
                monthly_income = NULL, budget_limit = NULL, user_name = NULL
                WHERE id = 1`);
              Logger.warn('Settings', 'Reset completo executado pelo usuário');
              Alert.alert(t('settings.resetDoneTitle'), t('settings.resetDoneMessage'));
            } catch {
              Alert.alert(t('common.error'), t('settings.resetError'));
            }
          },
        },
      ],
    );
  }, [t]);

  const handleBackup = useCallback(async () => {
    try {
      const txs = await TransactionRepository.findAll(2000, 0);
      const backupData = ExportService.toJSON(txs, accounts);
      await Share.share({
        title:   `FinTrack_Backup_${new Date().toISOString().split('T')[0]}.json`,
        message: backupData,
      });
      Logger.info('Settings', 'Backup gerado', { transactions: txs.length, accounts: accounts.length });
    } catch {
      Alert.alert(t('common.error'), t('settings.backupError'));
    }
  }, [accounts, t]);

  const handleClearLogs = useCallback(() => {
    Alert.alert(t('settings.clearLogsTitle'), t('settings.clearLogsMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.clearLogsAction'), onPress: () => Logger.clearLogs() },
    ]);
  }, [t]);

  const THEME_OPTIONS: Array<{ key: ThemeOption; label: string; icon: AppIconName }> = useMemo(() => [
    { key: 'light',  label: t('settings.themeLight'),  icon: 'sun' },
    { key: 'dark',   label: t('settings.themeDark'),   icon: 'moon' },
    { key: 'system', label: t('settings.themeSystem'), icon: 'monitor' },
  ], [t]);

  const LANG_OPTIONS: Array<{ key: LanguageOption; label: string }> = useMemo(() => [
    { key: 'pt-BR', label: t('settings.langPtBr') },
    { key: 'en-US', label: t('settings.langEnUs') },
  ], [t]);

  const currentThemeLabel = THEME_OPTIONS.find(opt => opt.key === settings.theme)?.label ?? t('settings.themeSystem');
  const currentLangLabel  = LANG_OPTIONS.find(l => l.key === (settings.language ?? 'pt-BR'))?.label ?? t('settings.langPtBr');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('settings.title')}
        onClose={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
      >
        {/* ── Conta ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <SettingsGroup title={t('settings.groupAccount')}>
            <SettingsRow
              icon="user" title={t('settings.personalPreferences')}
              subtitle={settings.userName ?? t('settings.personalPreferencesSubtitle')}
              onPress={() => navigation.navigate('Preferences')}
              first last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)}>
          <SettingsGroup title={t('settings.groupUpdates')}>
            <SettingsRow
              icon="download"
              title={t('settings.checkUpdates')}
              subtitle={
                checkingUpdate
                  ? (updateProgress != null
                    ? t('settings.downloading', { percent: updateProgress })
                    : t('settings.checkingGithub'))
                  : t('settings.installedVersion', { version: appVersion })
              }
              onPress={handleCheckUpdates}
              disabled={checkingUpdate}
              right={checkingUpdate ? <ActivityIndicator color={colors.primary} /> : undefined}
              first
            />
            <SettingsRow
              icon="share"
              title={t('settings.githubReleases')}
              subtitle={t('settings.downloadApkManually')}
              onPress={() => Linking.openURL(RELEASES_PAGE)}
              last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <SettingsGroup title={t('settings.groupNotifications')}>
            <SettingsRow
              icon="bell" title={t('settings.notificationAccess')}
              subtitle={settings.notificationPermissionGranted
                ? t('settings.permissionGranted')
                : t('settings.permissionRequired')}
              onPress={handleCheckPermission}
              right={
                <View style={[{
                  backgroundColor: settings.notificationPermissionGranted ? `${colors.success}20` : `${colors.warning}20`,
                  borderRadius: borderRadius.full,
                  paddingHorizontal: 8, paddingVertical: 3,
                }]}>
                  <Text style={[typography.styles.caption, {
                    color: settings.notificationPermissionGranted ? colors.success : colors.warning,
                  }]}>
                    {settings.notificationPermissionGranted ? t('settings.active') : t('settings.activate')}
                  </Text>
                </View>
              }
              first
            />
            <SettingsRow
              icon="bank" title={t('settings.monitoredBanks')}
              subtitle={t('settings.monitoredBanksSubtitle')}
              onPress={() => {}}
              last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <SettingsGroup title={t('settings.groupAppearance')}>
            <SettingsRow
              icon="palette" title={t('settings.theme')}
              subtitle={currentThemeLabel}
              onPress={() => setShowThemeModal(true)}
              first
            />
            <SettingsRow
              icon="language" title={t('settings.language')}
              subtitle={currentLangLabel}
              onPress={() => setShowLangModal(true)}
              last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <SettingsGroup title={t('settings.groupExport')}>
            <SettingsRow
              icon="export" title={t('settings.exportCsv')}
              subtitle={t('settings.exportCsvSubtitle', { count: txCount })}
              onPress={handleExportCSV}
              disabled={isExporting}
              first
            />
            <SettingsRow
              icon="file" title={t('settings.exportJson')}
              subtitle={t('settings.exportJsonSubtitle')}
              onPress={handleExportJSON}
              disabled={isExporting}
            />
            <SettingsRow
              icon="download" title={t('settings.exportExcel')}
              subtitle={t('settings.exportExcelSubtitle')}
              onPress={() => navigation.navigate('Export')}
              last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <SettingsGroup title={t('settings.groupBackup')}>
            <SettingsRow
              icon="upload" title={t('settings.backup')}
              subtitle={t('settings.backupSubtitle')}
              onPress={handleBackup}
              first
            />
            <SettingsRow
              icon="lock" title={t('settings.privacy')}
              subtitle={t('settings.privacySubtitle')}
              onPress={() => Alert.alert(
                t('settings.privacy'),
                t('settings.privacyMessage'),
              )}
            />
            <SettingsRow
              icon="shield" title={t('settings.localData')}
              subtitle={t('settings.localDataSubtitle')}
              first={false} last
              onPress={() => {}}
              right={
                <View style={[{ backgroundColor: `${colors.success}20`, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 }]}>
                  <Text style={[typography.styles.caption, { color: colors.success }]}>{t('settings.secure')}</Text>
                </View>
              }
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <SettingsGroup title={t('settings.groupAbout')}>
            <SettingsRow
              icon="phone" title={t('settings.appName')}
              subtitle={t('settings.appSubtitle', { version: appVersion })}
              first
            />
            <SettingsRow
              icon="file" title={t('settings.debugLogs')}
              subtitle={t('settings.debugLogsSubtitle')}
              onPress={handleClearLogs}
              last
            />
          </SettingsGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <SettingsGroup title={t('settings.groupDanger')}>
            <SettingsRow
              icon="trash" title={t('settings.resetData')}
              subtitle={t('settings.resetDataSubtitle')}
              onPress={handleResetData}
              isDestructive
              first last
            />
          </SettingsGroup>
        </Animated.View>
      </ScrollView>

      {/* ── Modal de Tema ────────────────────────────────────────────────────── */}
      <Modal visible={showThemeModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowThemeModal(false)}
          />
          <View style={[styles.bottomSheet, {
            backgroundColor: colors.card,
            borderTopLeftRadius:  borderRadius['2xl'],
            borderTopRightRadius: borderRadius['2xl'],
            padding: spacing.xl,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
                {t('settings.theme')}
              </Text>
              <CloseButton onPress={() => setShowThemeModal(false)} />
            </View>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setTheme(opt.key); setShowThemeModal(false); }}
                style={[{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: settings.theme === opt.key ? `${colors.primary}15` : 'transparent',
                  borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xs,
                }]}
              >
                <Icon name={opt.icon} size={22} color={settings.theme === opt.key ? colors.primary : colors.textSecondary} />
                <Text style={[typography.styles.bodyLarge, {
                  color: settings.theme === opt.key ? colors.primary : colors.text, flex: 1,
                }]}>
                  {opt.label}
                </Text>
                {settings.theme === opt.key && (
                  <Icon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Modal de Idioma ──────────────────────────────────────────────────── */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLangModal(false)}
          />
          <View style={[styles.bottomSheet, {
            backgroundColor: colors.card,
            borderTopLeftRadius:  borderRadius['2xl'],
            borderTopRightRadius: borderRadius['2xl'],
            padding: spacing.xl,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
                {t('settings.language')}
              </Text>
              <CloseButton onPress={() => setShowLangModal(false)} />
            </View>
            {LANG_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setLanguage?.(opt.key); setShowLangModal(false); }}
                style={[{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: (settings.language ?? 'pt-BR') === opt.key ? `${colors.primary}15` : 'transparent',
                  borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xs,
                }]}
              >
                <Icon name="language" size={22} color={(settings.language ?? 'pt-BR') === opt.key ? colors.primary : colors.textSecondary} />
                <Text style={[typography.styles.bodyLarge, {
                  color: (settings.language ?? 'pt-BR') === opt.key ? colors.primary : colors.text, flex: 1,
                }]}>
                  {opt.label}
                </Text>
                {(settings.language ?? 'pt-BR') === opt.key && (
                  <Icon name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {t('settings.langComingSoon')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      {},
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet:  {},
});
