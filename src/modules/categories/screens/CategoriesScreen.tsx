import React, { useEffect, useCallback, useState, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, Alert, Platform, StatusBar,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useTheme }        from '../../../hooks/useTheme';
import { useCategoryStore } from '../../../store/categoryStore';
import { Category }        from '../../../models/types';

const PRESET_ICONS  = ['🍔', '🛒', '🚗', '🏠', '💊', '📚', '🎮', '💳', '💰', '📺',
                       '✈️', '🎭', '🐾', '⚽', '🎸', '🧴', '🍺', '🎁', '🛠️', '📱'];
const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
                       '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#0891B2'];

const CategoryRow = memo(function CategoryRow({
  category, onDelete,
}: { category: Category; onDelete: (id: number) => void }) {
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
            {category.isSystem ? '🔒 Padrão do sistema' : '✏️ Personalizada'}
          </Text>
        </View>
        <View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: category.color }]} />
        {!category.isSystem && (
          <TouchableOpacity
            onPress={() => Alert.alert('Excluir', `Excluir "${category.name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => onDelete(category.id) },
            ])}
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
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { categories, loadCategories, addCategory, deleteCategory } = useCategoryStore();

  const [showModal, setShowModal] = useState(false);
  const [name,     setName]     = useState('');
  const [icon,     setIcon]     = useState(PRESET_ICONS[0]);
  const [color,    setColor]    = useState(PRESET_COLORS[0]);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Digite o nome da categoria.');
      return;
    }
    setSaving(true);
    try {
      await addCategory({ name: name.trim(), color, icon });
      setShowModal(false);
      setName(''); setIcon(PRESET_ICONS[0]); setColor(PRESET_COLORS[0]);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a categoria.');
    } finally {
      setSaving(false);
    }
  }, [name, color, icon, addCategory]);

  const handleDelete = useCallback((id: number) => { deleteCategory(id); }, [deleteCategory]);

  const systemCats = categories.filter(c => c.isSystem);
  const customCats = categories.filter(c => !c.isSystem);

  const sections = [
    { title: 'Padrão do sistema', data: systemCats, count: systemCats.length },
    { title: 'Personalizadas', data: customCats, count: customCats.length },
  ].filter(s => s.data.length > 0 || s.title === 'Personalizadas');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      <View style={[styles.header, {
        backgroundColor: colors.header,
        paddingTop: Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: spacing.base,
        paddingBottom: spacing.base,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>Categorias</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[{ backgroundColor: colors.primary, borderRadius: borderRadius.full, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }]}
        >
          <Text style={{ color: '#FFF', fontSize: 18 }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <CategoryRow category={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <Text style={[typography.styles.labelLarge, {
            color: colors.textSecondary, marginBottom: spacing.sm,
            textTransform: 'uppercase', letterSpacing: 0.8,
          }]}>
            {categories.length} categorias
          </Text>
        }
      />

      {/* Modal de criar categoria */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(300)}
            style={[styles.sheet, {
              backgroundColor: colors.card,
              borderTopLeftRadius: borderRadius['2xl'],
              borderTopRightRadius: borderRadius['2xl'],
              padding: spacing.xl,
            }]}
          >
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.lg }]}>
              Nova categoria
            </Text>

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
                {name || 'Nome da categoria'}
              </Text>
            </View>

            {/* Nome */}
            <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Nome *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Academia, Pet, Presentes..."
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
              Ícone
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
              Cor
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
                <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, textAlign: 'center' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                style={[{ flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.full, padding: 12 }]}
              >
                <Text style={[typography.styles.labelLarge, { color: '#FFF', textAlign: 'center' }]}>
                  {saving ? '...' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
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
