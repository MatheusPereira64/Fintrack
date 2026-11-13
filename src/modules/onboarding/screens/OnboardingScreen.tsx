import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  NativeModules, StatusBar, AppState, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAccountStore } from '../../../store/accountStore';
import { Logo } from '../../../components/Logo';
import { Icon, AppIconName } from '../../../components/Icon';
import { BANKS } from '../../../constants/banks';
import { useBackupActions } from '../../../hooks/useBackupActions';

const { NotificationModule } = NativeModules;

const FEATURED_BANKS = ['nubank', 'inter', 'itau', 'bradesco', 'bb', 'c6bank'];
const CONTENT_MAX_WIDTH = 480;

interface Feature {
  icon:  AppIconName;
  label: string;
}

interface Step {
  icon:      AppIconName;
  title:     string;
  subtitle:  string;
  description: string;
  features?: Feature[];
  showBanks?: boolean;
  isPermissionStep?: boolean;
}

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const completeOnboarding        = useSettingsStore(s => s.completeOnboarding);
  const setNotificationPermission = useSettingsStore(s => s.setNotificationPermission);
  const loadAccounts               = useAccountStore(s => s.loadAccounts);
  const { busy: restoring, restoreBackup } = useBackupActions();
  // O iOS não permite ler notificações de outros apps: lá o FinTrack é manual.
  const isIOS = Platform.OS === 'ios';

  const steps: Step[] = useMemo(() => [
    {
      icon: 'wallet',
      title: t('onboarding.step1Title'),
      subtitle: t('onboarding.step1Subtitle'),
      description: t('onboarding.step1Description'),
      features: [
        { icon: 'auto',      label: t('onboarding.welcomeFeature1') },
        { icon: 'shield',    label: t('onboarding.welcomeFeature2') },
        { icon: 'chart-pie', label: t('onboarding.welcomeFeature3') },
      ],
    },
    {
      icon: 'bell',
      title: t('onboarding.step2Title'),
      subtitle: t('onboarding.step2Subtitle'),
      description: t('onboarding.step2Description'),
      showBanks: true,
    },
    {
      icon: 'chart-line',
      title: t('onboarding.step3Title'),
      subtitle: t('onboarding.step3Subtitle'),
      description: t('onboarding.step3Description'),
      features: [
        { icon: 'category',      label: t('onboarding.insightsFeature1') },
        { icon: 'trending-up',   label: t('onboarding.insightsFeature2') },
        { icon: 'warning',       label: t('onboarding.insightsFeature3') },
      ],
    },
    {
      icon: 'lock',
      title: t('onboarding.step4Title'),
      subtitle: t('onboarding.step4Subtitle'),
      description: t('onboarding.step4Description'),
      isPermissionStep: true,
    },
  ], [t]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const banks = useMemo(
    () => FEATURED_BANKS.map(id => BANKS.find(b => b.id === id)).filter(Boolean) as typeof BANKS,
    [],
  );

  const checkPermission = useCallback(async () => {
    if (!NotificationModule?.hasNotificationPermission) return;
    try {
      const granted = await NotificationModule.hasNotificationPermission();
      setPermissionGranted(granted);
      await setNotificationPermission(granted);
    } catch {}
  }, [setNotificationPermission]);

  // Confere a permissão quando o usuário volta das configurações do Android,
  // em vez de esperar um tempo fixo que pode acabar antes de ele ativar.
  useEffect(() => {
    if (!permissionRequested) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void checkPermission();
    });
    return () => sub.remove();
  }, [permissionRequested, checkPermission]);

  const handlePermission = async () => {
    if (!NotificationModule) return;
    try {
      setPermissionRequested(true);
      await NotificationModule.openNotificationSettings();
    } catch {}
  };

  const handleFinish = async () => {
    await Promise.all([
      completeOnboarding(),
      loadAccounts(),
    ]);
  };

  const handleRestore = async () => {
    if (await restoreBackup()) await handleFinish();
  };

  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      {/* Topo: marca e atalho para a permissão */}
      <View style={[styles.topBar, styles.column, { paddingHorizontal: spacing.xl }]}>
        <View style={styles.brand}>
          <Logo size={28} />
          <Text style={[typography.styles.titleMedium, { color: colors.text, marginLeft: spacing.sm }]}>
            FinTrack
          </Text>
        </View>
        {!isLast && (
          <Pressable
            onPress={() => setCurrentStep(steps.length - 1)}
            accessibilityRole="button"
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: spacing.xs })}
          >
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary }]}>
              {t('onboarding.skip')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Progresso */}
      <View style={[styles.progress, styles.column, { paddingHorizontal: spacing.xl, marginTop: spacing.md, gap: spacing.xs }]}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.progressSegment, {
              backgroundColor: i <= currentStep ? colors.primary : colors.border,
            }]}
          />
        ))}
      </View>

      {/* Conteúdo do passo: rola em telas baixas ou com fonte ampliada */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* O logo já é um ícone com fundo próprio; os demais passos usam um ícone num bloco. */}
        {isFirst ? (
          <Logo size={96} />
        ) : (
          <View style={[styles.hero, { backgroundColor: colors.primaryLight, borderRadius: borderRadius['3xl'] }]}>
            <Icon name={step.icon} size={44} color={colors.primary} />
          </View>
        )}

        <Text style={[typography.styles.labelMedium, styles.overline, { color: colors.primary, marginTop: spacing.xl }]}>
          {t('onboarding.stepCounter', { current: currentStep + 1, total: steps.length })}
        </Text>
        <Text
          accessibilityRole="header"
          style={[typography.styles.headlineLarge, { color: colors.text, marginTop: spacing.xs }]}
        >
          {step.title}
        </Text>
        <Text style={[typography.styles.titleMedium, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {step.subtitle}
        </Text>
        <Text style={[typography.styles.bodyLarge, { color: colors.textSecondary, marginTop: spacing.md }]}>
          {step.description}
        </Text>

        {step.features && (
          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderRadius: borderRadius.xl,
            borderColor: colors.borderLight,
            marginTop: spacing.xl,
            padding: spacing.base,
            gap: spacing.md,
          }]}>
            {step.features.map(f => (
              <View key={f.label} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.md }]}>
                  <Icon name={f.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[typography.styles.bodyMedium, styles.featureText, { color: colors.text, marginLeft: spacing.md }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isFirst && (
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.restoreLink, { marginTop: spacing.base, opacity: pressed || restoring ? 0.6 : 1 }]}
          >
            <Icon name="download" size={18} color={colors.primary} />
            <Text style={[typography.styles.labelLarge, { color: colors.primary, marginLeft: spacing.sm }]}>
              {t('backup.onboardingRestore')}
            </Text>
          </Pressable>
        )}

        {isIOS && (step.showBanks || step.isPermissionStep) && (
          <View style={[styles.card, styles.featureRow, {
            backgroundColor: `${colors.warning}14`,
            borderColor: colors.warning,
            borderRadius: borderRadius.xl,
            marginTop: spacing.xl,
            padding: spacing.base,
          }]}>
            <Icon name="info" size={22} color={colors.warning} />
            <Text style={[typography.styles.bodyMedium, styles.featureText, { color: colors.text, marginLeft: spacing.md }]}>
              {t('onboarding.iosNotice')}
            </Text>
          </View>
        )}

        {step.showBanks && (
          <View style={[styles.banks, { marginTop: spacing.xl, gap: spacing.sm }]}>
            {banks.map(bank => (
              <View
                key={bank.id}
                style={[styles.bankChip, {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  borderRadius: borderRadius.full,
                }]}
              >
                <View style={[styles.bankDot, { backgroundColor: bank.primaryColor }]} />
                <Text style={[typography.styles.labelLarge, { color: colors.text }]}>{bank.name}</Text>
              </View>
            ))}
            <Text style={[typography.styles.labelLarge, styles.banksMore, { color: colors.textSecondary }]}>
              {t('onboarding.banksMore')}
            </Text>
          </View>
        )}

        {step.isPermissionStep && !isIOS && (
          <>
            <View style={[styles.card, styles.featureRow, {
              backgroundColor: colors.card,
              borderRadius: borderRadius.xl,
              borderColor: colors.borderLight,
              marginTop: spacing.xl,
              padding: spacing.base,
            }]}>
              <Icon name="shield" size={22} color={colors.success} />
              <Text style={[typography.styles.bodyMedium, styles.featureText, { color: colors.text, marginLeft: spacing.md }]}>
                {t('onboarding.privacyNote')}
              </Text>
            </View>

            <Pressable
              onPress={handlePermission}
              disabled={permissionGranted}
              accessibilityRole="button"
              accessibilityState={{ disabled: permissionGranted }}
              style={({ pressed }) => [styles.permissionBtn, {
                backgroundColor: permissionGranted ? `${colors.success}18` : colors.primaryLight,
                borderColor: permissionGranted ? colors.success : colors.primary,
                borderRadius: borderRadius.xl,
                marginTop: spacing.md,
                padding: spacing.base,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Icon
                name={permissionGranted ? 'check-circle' : 'bell'}
                size={22}
                color={permissionGranted ? colors.success : colors.primary}
              />
              <View style={[styles.featureText, { marginLeft: spacing.md }]}>
                <Text style={[typography.styles.titleSmall, { color: permissionGranted ? colors.success : colors.primary }]}>
                  {permissionGranted ? t('onboarding.permissionGranted') : t('onboarding.grantPermission')}
                </Text>
                {permissionRequested && !permissionGranted && (
                  <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                    {t('onboarding.permissionPending')}
                  </Text>
                )}
              </View>
              {!permissionGranted && <Icon name="forward" size={20} color={colors.primary} />}
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Ações */}
      <View style={[styles.actions, styles.column, {
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.base + Math.max(insets.bottom, 8),
      }]}>
        {!isFirst && (
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={({ pressed }) => [styles.backBtn, {
              backgroundColor: colors.surfaceVariant,
              borderRadius: borderRadius.full,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Icon name="back" size={24} color={colors.text} />
          </Pressable>
        )}
        <Pressable
          onPress={isLast ? handleFinish : goNext}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryBtn, {
            backgroundColor: colors.primary,
            borderRadius: borderRadius.full,
            opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Text style={[typography.styles.titleMedium, { color: colors.onPrimary }]}>
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </Text>
          <Icon
            name={isLast ? 'check' : 'forward'}
            size={20}
            color={colors.onPrimary}
            style={{ marginLeft: spacing.xs }}
          />
        </Pressable>
      </View>
    </View>
  );
}

const BUTTON_HEIGHT = 52;

const styles = StyleSheet.create({
  container: { flex: 1 },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  progress: { flexDirection: 'row' },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  hero: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  overline: { textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderWidth: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  banks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  bankChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  bankDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  banksMore: { paddingHorizontal: 4 },
  restoreLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  permissionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  actions: { flexDirection: 'row' },
  backBtn: { width: BUTTON_HEIGHT, height: BUTTON_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: {
    flex: 1, height: BUTTON_HEIGHT,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
});
