import React, { useEffect, useCallback, useState, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme }        from '../../../hooks/useTheme';
import { useCategoryStore } from '../../../store/categoryStore';
import { AppHeader } from '../../../components/AppHeader';
import { CloseButton } from '../../../components/CloseButton';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { Category }        from '../../../models/types';

const PRESET_ICONS  = ['🍔', '🛒', '🚗', '🏠', '💊', '📚', '🎮', '💳', '💰', '📺',
                       '✈️', '🎭', '🐾', '⚽', '🎸', '🧴', '🍺', '🎁', '🛠️', '📱'];
const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
                       '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0891B2'];

const CategoryRow = memo(function CategoryRow({
  category, onDelete,
}: { category: Category; onDelete: (id: number) => void }) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View style={[{
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
      }]}>
        <View style={[{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: `${category.color}20`,
          justifyContent: 'center', alignItems: 'center',
          marginRight: spacing.md,
        }]}>
          <Text style={{ fontSize: 20 }}>{category.icon ?? '📦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.styles.bodyLarge, { color: colors.text }]}>{category.name}</Text>
          <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
            {category.isSystem
              ? `🔒 ${t('categories.systemDefault')}`
              : `✏️ ${t('categories.custom')}`}
          </Text>
        </View>
        <View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: category.color }]} />
        {!category.isSystem && (
          <TouchableOpacity
            onPress={() => Alert.alert(
              t('categories.deleteTitle'),
              t('categories.deleteMessage', { name: category.name }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(category.id) },
              ],
            )}
            style={{ marginLeft: spacing.md, padding: spacing.xs }}
          >
            <Text style={{ color: colors.error }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

export function CategoriesScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const categories     = useCategoryStore(s => s.categories);
  const loadCategories = useCategoryStore(s => s.loadCategories);
  const addCategory    = useCategoryStore(s => s.addCategory);
  const deleteCategory = useCategoryStore(s => s.deleteCategory);

  const [showModal, setShowModal] = useState(false);
  const [name,     setName]     = useState('');
  const [icon,     setIcon]     = useState(PRESET_ICONS[0]);
  const [color,    setColor]    = useState(PRESET_COLORS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert(t('common.warning'), t('categories.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      await addCategory({ name: name.trim(), color, icon });
      setShowModal(false);
      setName(''); setIcon(PRESET_ICONS[0]); setColor(PRESET_COLORS[0]);
    } catch {
      Alert.alert(t('common.error'), t('categories.createError'));
    } finally {
      setSaving(false);
    }
  }, [name, color, icon, addCategory, t]);

  const handleDelete = useCallback((id: number) => { deleteCategory(id); }, [deleteCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('categories.title')}
        onClose={() => navigation.goBack()}
        actions={[{ icon: 'add', onPress: () => setShowModal(true), color: colors.primary }]}
      />

      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        renderItem={({ item }) => (
          <CategoryRow category={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <Text style={[typography.styles.labelLarge, {
            color: colors.textSecondary, marginBottom: spacing.sm,
            textTransform: 'uppercase', letterSpacing: 0.8,
          }]}>
            {t('categories.count', { count: categories.length })}
          </Text>
        }
      />

      {/* Modal de criar categoria */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
            }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={[typography.styles.titleLarge, { color: colors.text, flex: 1, marginRight: spacing.sm }]}>
                {t('categories.newCategory')}
              </Text>
              <CloseButton onPress={() => setShowModal(false)} />
            </View>

            {/* Preview */}
            <View style={[styles.preview, {
              backgroundColor: `${color}15`,
              borderRadius: borderRadius.xl,
              padding: spacing.md,
              marginBottom: spacing.lg,
              alignItems: 'center',
              borderWidth: 1, borderColor: `${color}40`,
            }]}>
              <Text style={{ fontSize: 32, marginBottom: 4 }}>{icon}</Text>
              <Text style={[typography.styles.titleSmall, { color }]}>
                {name || t('categories.namePreview')}
              </Text>
            </View>

            {/* Nome */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('categories.nameLabel')}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('categories.namePlaceholder')}
              placeholderTextColor={colors.placeholder}
              style={[{
                backgroundColor: colors.inputBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                color: colors.inputText,
                marginBottom: spacing.lg,
              }, typography.styles.bodyMedium]}
            />

            {/* Ícones */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('categories.icon')}
            </Text>
            <View style={[styles.iconGrid, { marginBottom: spacing.lg }]}>
              {PRESET_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: icon === ic ? `${color}30` : colors.surfaceVariant,
                    justifyContent: 'center', alignItems: 'center',
                    borderWidth: icon === ic ? 2 : 0,
                    borderColor: color,
                  }]}
                >
                  <Text style={{ fontSize: 20 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cores */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              {t('categories.color')}
            </Text>
            <View style={[styles.colorRow, { marginBottom: spacing.xl }]}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: '#FFF',
                    shadowColor: color === c ? c : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 3,
                    elevation: color === c ? 3 : 0,
                  }]}
                />
              ))}
            </View>

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[{ flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, padding: 12 }]}
              >
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={[{ flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.full, padding: 12 }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  {saving ? '...' : t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlay:   { flex: 1, justifyContent: 'flex-end' },
  sheet:     {},
  preview:   {},
  iconGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
