import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, Switch, Alert, Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme }          from '../../../hooks/useTheme';
import { useSettingsStore }  from '../../../store/settingsStore';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore }   from '../../../store/accountStore';
import { ExportService }     from '../../../services/ExportService';
import { Logger }            from '../../../services/LoggerService';
import { getDatabase }       from '../../../database/db';

import { Share } from 'react-native';

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
  icon:       string;
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
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();

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
        <Text style={{ fontSize: 16 }}>{icon}</Text>
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
        <Text style={{ color: colors.textTertiary, fontSize: 16 }}>›</Text>
      ))}
    </TouchableOpacity>
  );
}

export function SettingsScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const { settings, setTheme, setLanguage } = useSettingsStore();
  const { transactions }  = useTransactionStore();
  const { accounts }      = useAccountStore();

  const [isExporting, setIsExporting] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLangModal, setShowLangModal]   = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCheckPermission = useCallback(async () => {
    const { NotificationModule } = require('../../../../android/app/src/main/java/com/fintrackapp/notification/NotificationModule');
    // Na prática usa o bridge correto:
    try {
      const { NativeModules } = require('react-native');
      const mod = NativeModules.NotificationModule;
      if (mod?.openNotificationSettings) {
        mod.openNotificationSettings();
      }
    } catch {
      Alert.alert('Info', 'Vá em Configurações → Acesso a Notificações → FinTrack');
    }
  }, []);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const csv = ExportService.toCSV(transactions, accounts);
      await Share.share({
        title:   `FinTrack_${new Date().toISOString().split('T')[0]}.csv`,
        message: csv,
      });
      Logger.info('Settings', 'Exportação CSV concluída', { count: transactions.length });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o CSV.');
    } finally {
      setIsExporting(false);
    }
  }, [transactions, accounts]);

  const handleExportJSON = useCallback(async () => {
    setIsExporting(true);
    try {
      const json = ExportService.toJSON(transactions, accounts);
      await Share.share({
        title:   `FinTrack_${new Date().toISOString().split('T')[0]}.json`,
        message: json,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o JSON.');
    } finally {
      setIsExporting(false);
    }
  }, [transactions, accounts]);

  const handleResetData = useCallback(() => {
    Alert.alert(
      '⚠️ Resetar todos os dados',
      'Esta ação é irreversível. Todas as transações, contas e configurações serão apagadas permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text:  'Resetar',
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
              Alert.alert('✅ Concluído', 'Todos os dados foram removidos. Reinicie o app.');
            } catch {
              Alert.alert('Erro', 'Falha ao resetar os dados.');
            }
          },
        },
      ],
    );
  }, []);

  const handleBackup = useCallback(async () => {
    try {
      const backupData = ExportService.toJSON(transactions, accounts);
      await Share.share({
        title:   `FinTrack_Backup_${new Date().toISOString().split('T')[0]}.json`,
        message: backupData,
      });
      Logger.info('Settings', 'Backup gerado', { transactions: transactions.length, accounts: accounts.length });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o backup.');
    }
  }, [transactions, accounts]);

  const handleClearLogs = useCallback(() => {
    Alert.alert('Limpar logs', 'Deseja remover todos os logs de depuração?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', onPress: () => Logger.clearLogs() },
    ]);
  }, []);

  const THEME_OPTIONS: Array<{ key: ThemeOption; label: string; icon: string }> = [
    { key: 'light',  label: 'Claro',    icon: '☀️'  },
    { key: 'dark',   label: 'Escuro',   icon: '🌙'  },
    { key: 'system', label: 'Sistema',  icon: '⚙️'  },
  ];

  const LANG_OPTIONS: Array<{ key: LanguageOption; label: string; icon: string }> = [
    { key: 'pt-BR', label: 'Português (BR)', icon: '🇧🇷' },
    { key: 'en-US', label: 'English (US)',   icon: '🇺🇸' },
  ];

  const currentThemeLabel = THEME_OPTIONS.find(t => t.key === settings.theme)?.label ?? 'Sistema';
  const currentLangLabel  = LANG_OPTIONS.find(l => l.key === (settings.language ?? 'pt-BR'))?.label ?? 'Português';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, {
        paddingTop:       Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: spacing.base,
        paddingBottom:    spacing.base,
        backgroundColor:  colors.header,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }]}>
        <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>
          Configurações
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
      >
        {/* ── Conta ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <SettingsGroup title="Conta">
            <SettingsRow
              icon="👤" title="Preferências pessoais"
              subtitle={settings.userName ?? 'Nome, renda, limite mensal'}
              onPress={() => navigation.navigate('Preferences')}
              first last
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Notificações ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <SettingsGroup title="Notificações">
            <SettingsRow
              icon="🔔" title="Acesso a notificações"
              subtitle={settings.notificationPermissionGranted ? '✅ Permissão concedida' : '⚠️ Permissão necessária'}
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
                    {settings.notificationPermissionGranted ? 'Ativo' : 'Ativar'}
                  </Text>
                </View>
              }
              first
            />
            <SettingsRow
              icon="🏦" title="Bancos monitorados"
              subtitle="Nubank, Inter, Itaú, Bradesco, BB e mais"
              onPress={() => {}}
              last
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Aparência ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <SettingsGroup title="Aparência">
            <SettingsRow
              icon="🎨" title="Tema"
              subtitle={currentThemeLabel}
              onPress={() => setShowThemeModal(true)}
              first
            />
            <SettingsRow
              icon="🌐" title="Idioma"
              subtitle={currentLangLabel}
              onPress={() => setShowLangModal(true)}
              last
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Exportação ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <SettingsGroup title="Exportação">
            <SettingsRow
              icon="📊" title="Exportar CSV"
              subtitle={`${transactions.length} transações disponíveis`}
              onPress={handleExportCSV}
              disabled={isExporting || transactions.length === 0}
              first
            />
            <SettingsRow
              icon="📋" title="Exportar JSON"
              subtitle="Formato completo com todos os campos"
              onPress={handleExportJSON}
              disabled={isExporting || transactions.length === 0}
            />
            <SettingsRow
              icon="🔢" title="Exportar Excel (CSV)"
              subtitle="Compatível com Excel e Google Sheets"
              onPress={() => navigation.navigate('Export')}
              last
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Backup e Segurança ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <SettingsGroup title="Backup e Segurança">
            <SettingsRow
              icon="💾" title="Fazer backup"
              subtitle="Exporta todos os dados em formato JSON"
              onPress={handleBackup}
              first
            />
            <SettingsRow
              icon="🔒" title="Privacidade"
              subtitle="Todos os dados são armazenados localmente"
              onPress={() => Alert.alert(
                '🔒 Privacidade',
                'O FinTrack armazena todos os seus dados exclusivamente no seu dispositivo. Nenhuma informação financeira é enviada para servidores externos.\n\nPermissões utilizadas:\n• Acesso a notificações: para detectar transações bancárias automaticamente.',
              )}
            />
            <SettingsRow
              icon="🛡️" title="Dados locais"
              subtitle="Sem envio de notificações para servidores"
              first={false} last
              onPress={() => {}}
              right={
                <View style={[{ backgroundColor: `${colors.success}20`, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 }]}>
                  <Text style={[typography.styles.caption, { color: colors.success }]}>Seguro</Text>
                </View>
              }
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Sobre ─────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <SettingsGroup title="Sobre">
            <SettingsRow
              icon="📱" title="FinTrack"
              subtitle="Versão 2.0.0 — Monitor financeiro inteligente"
              first
            />
            <SettingsRow
              icon="📝" title="Logs de depuração"
              subtitle="Ver e limpar logs do sistema"
              onPress={handleClearLogs}
              last
            />
          </SettingsGroup>
        </Animated.View>

        {/* ── Zona de Perigo ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)}>
          <SettingsGroup title="Zona de perigo">
            <SettingsRow
              icon="🗑️" title="Resetar todos os dados"
              subtitle="Remove permanentemente transações, contas e configurações"
              onPress={handleResetData}
              isDestructive
              first last
            />
          </SettingsGroup>
        </Animated.View>
      </ScrollView>

      {/* ── Modal de Tema ────────────────────────────────────────────────────── */}
      <Modal visible={showThemeModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={[styles.bottomSheet, {
            backgroundColor: colors.card,
            borderTopLeftRadius:  borderRadius['2xl'],
            borderTopRightRadius: borderRadius['2xl'],
            padding: spacing.xl,
          }]}>
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Tema
            </Text>
            {THEME_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setTheme(opt.key); setShowThemeModal(false); }}
                style={[{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: settings.theme === opt.key ? `${colors.primary}15` : 'transparent',
                  borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xs,
                }]}
              >
                <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                <Text style={[typography.styles.bodyLarge, {
                  color: settings.theme === opt.key ? colors.primary : colors.text, flex: 1,
                }]}>
                  {opt.label}
                </Text>
                {settings.theme === opt.key && (
                  <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal de Idioma ──────────────────────────────────────────────────── */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={[styles.bottomSheet, {
            backgroundColor: colors.card,
            borderTopLeftRadius:  borderRadius['2xl'],
            borderTopRightRadius: borderRadius['2xl'],
            padding: spacing.xl,
          }]}>
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Idioma
            </Text>
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
                <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                <Text style={[typography.styles.bodyLarge, {
                  color: (settings.language ?? 'pt-BR') === opt.key ? colors.primary : colors.text, flex: 1,
                }]}>
                  {opt.label}
                </Text>
                {(settings.language ?? 'pt-BR') === opt.key && (
                  <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              * A tradução completa para inglês estará disponível em breve.
            </Text>
          </View>
        </TouchableOpacity>
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
