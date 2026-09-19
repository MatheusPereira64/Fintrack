import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, NativeModules, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAccountStore } from '../../../store/accountStore';
import { Logo } from '../../../components/Logo';

const { width } = Dimensions.get('window');
const { NotificationModule } = NativeModules;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const completeOnboarding        = useSettingsStore(s => s.completeOnboarding);
  const setNotificationPermission = useSettingsStore(s => s.setNotificationPermission);
  const loadAccounts               = useAccountStore(s => s.loadAccounts);

  const steps = useMemo(() => [
    {
      emoji: '💜',
      title: t('onboarding.step1Title'),
      subtitle: t('onboarding.step1Subtitle'),
      description: t('onboarding.step1Description'),
    },
    {
      emoji: '🔔',
      title: t('onboarding.step2Title'),
      subtitle: t('onboarding.step2Subtitle'),
      description: t('onboarding.step2Description'),
    },
    {
      emoji: '📊',
      title: t('onboarding.step3Title'),
      subtitle: t('onboarding.step3Subtitle'),
      description: t('onboarding.step3Description'),
    },
    {
      emoji: '🔐',
      title: t('onboarding.step4Title'),
      subtitle: t('onboarding.step4Subtitle'),
      description: t('onboarding.step4Description'),
      isPermissionStep: true,
    },
  ], [t]);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      scrollRef.current?.scrollTo({ x: (currentStep + 1) * width, animated: true });
    }
  };

  const handlePermission = async () => {
    if (!NotificationModule) return;
    try {
      await NotificationModule.openNotificationSettings();
      // Aguarda o usuário retornar para verificar
      setTimeout(async () => {
        const granted = await NotificationModule.hasNotificationPermission();
        setPermissionGranted(granted);
        await setNotificationPermission(granted);
      }, 1500);
    } catch {}
  };

  const handleFinish = async () => {
    await Promise.all([
      completeOnboarding(),
      loadAccounts(),
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      {/* Conteúdo do step */}
      <View style={styles.content}>
        {/* Emoji grande */}
        {currentStep === 0 ? (
          <Logo size={120} style={{ marginBottom: spacing.sm }} />
        ) : (
          <View style={[styles.emojiContainer, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full }]}>
            <Text style={styles.emoji}>{step.emoji}</Text>
          </View>
        )}

        <Text style={[typography.styles.headlineLarge, { color: colors.text, textAlign: 'center', marginTop: spacing.xl }]}>
          {step.title}
        </Text>
        <Text style={[typography.styles.titleSmall, { color: colors.primary, textAlign: 'center', marginTop: spacing.xs }]}>
          {step.subtitle}
        </Text>
        <Text style={[typography.styles.bodyLarge, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 26 }]}>
          {step.description}
        </Text>

        {/* Bancos suportados (step 1) */}
        {currentStep === 1 && (
          <View style={[styles.banksRow, { marginTop: spacing.xl }]}>
            {['💜 Nubank', '🟠 Inter', '🔵 Itaú', '❤️ Bradesco', '💛 BB', '⚫ C6'].map(b => (
              <View key={b} style={[styles.bankChip, { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full }]}>
                <Text style={[typography.styles.labelMedium, { color: colors.text }]}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Botão de permissão (step 3) */}
        {step.isPermissionStep && (
          <TouchableOpacity
            onPress={handlePermission}
            style={[
              styles.permissionBtn,
              {
                backgroundColor: permissionGranted ? colors.success : colors.primary,
                borderRadius: borderRadius.full,
                padding: spacing.base,
                marginTop: spacing.xl,
                ...shadows.md,
              },
            ]}
          >
            <Text style={[typography.styles.titleSmall, { color: '#FFFFFF', textAlign: 'center' }]}>
              {permissionGranted
                ? `✅ ${t('onboarding.permissionGranted')}`
                : `🔔 ${t('onboarding.grantPermission')}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicadores de passo */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentStep ? colors.primary : colors.border,
                width: i === currentStep ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Botão de ação */}
      <TouchableOpacity
        onPress={isLast ? handleFinish : goNext}
        style={[
          styles.actionBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: borderRadius.full,
            marginHorizontal: spacing.xl,
            marginBottom: spacing.xl + Math.max(insets.bottom, 12),
            padding: spacing.base,
            ...shadows.lg,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={[typography.styles.titleMedium, { color: '#FFFFFF', textAlign: 'center' }]}>
          {isLast ? `🚀 ${t('onboarding.start')}` : t('onboarding.next')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emojiContainer: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  banksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  bankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  permissionBtn: {
    width: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    alignSelf: 'stretch',
  },
});
