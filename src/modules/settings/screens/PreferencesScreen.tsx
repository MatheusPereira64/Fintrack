import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme }        from '../../../hooks/useTheme';
import { useSettingsStore } from '../../../store/settingsStore';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { Icon } from '../../../components/Icon';

const LANGUAGES = [
  { code: 'pt-BR', flag: '🇧🇷' },
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
] as const;

export function PreferencesScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const settings       = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  const [userName, setUserName]         = useState(settings.userName ?? '');
  const [monthlyIncome, setMonthlyIncome] = useState(
    settings.monthlyIncome ? String(settings.monthlyIncome) : '',
  );
  const [budgetLimit, setBudgetLimit]   = useState(
    settings.budgetLimit ? String(settings.budgetLimit) : '',
  );

  const handleSave = async () => {
    await updateSettings({
      userName:      userName.trim() || undefined,
      monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome.replace(',', '.')) : undefined,
      budgetLimit:   budgetLimit   ? parseFloat(budgetLimit.replace(',', '.'))   : undefined,
    });
    Alert.alert(t('preferences.saved'), t('preferences.savedMessage'));
    navigation.goBack();
  };

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    await updateSettings({ language: languageCode as any });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('preferences.title')}
        onClose={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.save')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}>
        <View style={[{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.base, ...shadows.sm, marginBottom: spacing.base }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{t('preferences.yourName')}</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder={t('preferences.namePlaceholder')}
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md, marginBottom: spacing.lg }]}
          />

          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{t('preferences.monthlyIncome')}</Text>
          <TextInput
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            keyboardType="decimal-pad"
            placeholder={t('preferences.incomePlaceholder')}
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md, marginBottom: spacing.lg }]}
          />

          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{t('preferences.budgetLimit')}</Text>
          <TextInput
            value={budgetLimit}
            onChangeText={setBudgetLimit}
            keyboardType="decimal-pad"
            placeholder={t('preferences.budgetPlaceholder')}
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md }]}
          />
        </View>

        <View style={[{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.base, ...shadows.sm }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.md }]}>{t('preferences.language')}</Text>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={[{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: i18n.language === lang.code ? colors.surfaceVariant : 'transparent',
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.xs,
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                <Text style={[typography.styles.bodyMedium, { 
                  color: i18n.language === lang.code ? colors.primary : colors.text,
                  fontWeight: i18n.language === lang.code ? '600' : '400',
                }]}>
                  {t(`languages.${lang.code}`)}
                </Text>
              </View>
              {i18n.language === lang.code && (
                <Icon name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
