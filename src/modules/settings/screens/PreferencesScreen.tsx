import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, StatusBar, Alert,
} from 'react-native';
import { useTheme }        from '../../../hooks/useTheme';
import { useSettingsStore } from '../../../store/settingsStore';

export function PreferencesScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { settings, updateSettings } = useSettingsStore();

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
    Alert.alert('Salvo', 'Preferências atualizadas!');
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />

      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS === 'android' ? 48 : 56, paddingHorizontal: spacing.base, paddingBottom: spacing.base, ...shadows.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[typography.styles.titleLarge, { color: colors.text }]}>Preferências</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <View style={[{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.base, ...shadows.sm }]}>
          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Seu nome</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="Ex: João"
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md, marginBottom: spacing.lg }]}
          />

          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Renda mensal</Text>
          <TextInput
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            keyboardType="decimal-pad"
            placeholder="Ex: 5000,00"
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md, marginBottom: spacing.lg }]}
          />

          <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Limite de gastos mensais</Text>
          <TextInput
            value={budgetLimit}
            onChangeText={setBudgetLimit}
            keyboardType="decimal-pad"
            placeholder="Ex: 3000,00"
            placeholderTextColor={colors.placeholder}
            style={[{ backgroundColor: colors.inputBackground, borderRadius: borderRadius.lg, color: colors.inputText, padding: spacing.md }]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
