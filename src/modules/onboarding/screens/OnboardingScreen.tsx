import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, NativeModules, StatusBar,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAccountStore } from '../../../store/accountStore';

const { width } = Dimensions.get('window');
const { NotificationModule } = NativeModules;

const STEPS = [
  {
    emoji: '💜',
    title: 'Bem-vindo ao FinTrack',
    subtitle: 'Seu monitor financeiro inteligente',
    description:
      'Acompanhe automaticamente suas finanças monitorando as notificações dos seus aplicativos bancários. Sem cadastrar nada na mão.',
  },
  {
    emoji: '🔔',
    title: 'Monitoramento automático',
    subtitle: 'Basta receber a notificação do banco',
    description:
      'O FinTrack lê as notificações do Nubank, Inter, Itaú, Bradesco e outros. Cada Pix, compra ou transferência é registrado automaticamente.',
  },
  {
    emoji: '📊',
    title: 'Insights financeiros',
    subtitle: 'Entenda seus gastos',
    description:
      'Veja gráficos, categorias e relatórios mensais. O FinTrack analisa seus padrões e te ajuda a economizar.',
  },
  {
    emoji: '🔐',
    title: 'Permissão necessária',
    subtitle: 'Para funcionar, precisamos de acesso',
    description:
      'Na próxima tela, você será direcionado para Configurações → Acesso a Notificações. Ative o FinTrack para começar o monitoramento.',
    isPermissionStep: true,
  },
];

export function OnboardingScreen() {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [userName, setUserName] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const completeOnboarding        = useSettingsStore(s => s.completeOnboarding);
  const setNotificationPermission = useSettingsStore(s => s.setNotificationPermission);
  const loadAccounts               = useAccountStore(s => s.loadAccounts);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
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
        <View style={[styles.emojiContainer, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full }]}>
          <Text style={styles.emoji}>{step.emoji}</Text>
        </View>

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
              {permissionGranted ? '✅ Permissão concedida!' : '🔔 Conceder acesso às notificações'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicadores de passo */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
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
            marginBottom: spacing['2xl'],
            padding: spacing.base,
            ...shadows.lg,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={[typography.styles.titleMedium, { color: '#FFFFFF', textAlign: 'center' }]}>
          {isLast ? '🚀 Começar' : 'Próximo →'}
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
