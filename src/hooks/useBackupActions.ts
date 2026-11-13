import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { useTranslation } from 'react-i18next';
import { BackupService, BackupError } from '../services/BackupService';
import { DeviceService } from '../services/DeviceService';
import { pickImportFile } from '../services/ImportService';
import { Logger } from '../services/LoggerService';
import { useSettingsStore } from '../store/settingsStore';
import { useAccountStore } from '../store/accountStore';
import { useCategoryStore } from '../store/categoryStore';
import { useTransactionStore } from '../store/transactionStore';
import { useBudgetStore } from '../store/budgetStore';
import { useGoalStore } from '../store/goalStore';
import { useReviewStore } from '../store/reviewStore';

/** Criar e restaurar o backup completo, com confirmações e recarga dos dados. */
export function useBackupActions() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const reloadAll = useCallback(async () => {
    const now = new Date();
    await useSettingsStore.getState().loadSettings();
    await Promise.all([
      useAccountStore.getState().loadAccounts(),
      useCategoryStore.getState().loadCategories(),
      useTransactionStore.getState().loadByMonth(now.getFullYear(), now.getMonth() + 1),
      useBudgetStore.getState().loadBudgets(),
      useGoalStore.getState().loadGoals(),
      useReviewStore.getState().refreshCounts(),
    ]);
    useTransactionStore.getState().loadMonthlyTotals();
  }, []);

  const createBackup = useCallback(async () => {
    setBusy(true);
    try {
      const path = await BackupService.writeToFile();
      await DeviceService.shareFile(path, 'application/json', t('backup.shareTitle'));
      Logger.info('Backup', 'Backup completo gerado');
    } catch (e) {
      Logger.error('Backup', 'Falha ao gerar backup', e);
      Alert.alert(t('common.error'), t('settings.backupError'));
    } finally {
      setBusy(false);
    }
  }, [t]);

  /** Resolve true quando os dados foram restaurados. */
  const restoreBackup = useCallback(async (): Promise<boolean> => {
    const file = await pickImportFile().catch(() => null);
    if (!file) return false;

    let backup;
    try {
      const content = await RNFS.readFile(file.fileCopyUri ?? file.uri, 'utf8');
      backup = BackupService.parse(content);
    } catch (e) {
      const newer = e instanceof BackupError && e.code === 'newer';
      Alert.alert(t('common.error'), newer ? t('backup.newerVersion') : t('backup.invalidFile'));
      return false;
    }

    const confirmed = await new Promise<boolean>(resolve => {
      Alert.alert(
        t('backup.restoreTitle'),
        t('backup.restoreMessage', { date: new Date(backup.createdAt).toLocaleDateString() }),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('backup.restoreAction'), style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return false;

    setBusy(true);
    try {
      const summary = await BackupService.restore(backup);
      await reloadAll();
      Logger.info('Backup', 'Backup restaurado', summary);
      Alert.alert(t('backup.restoredTitle'), t('backup.restoredMessage', { count: summary.rows }));
      return true;
    } catch (e) {
      Logger.error('Backup', 'Falha ao restaurar backup', e);
      const newer = e instanceof BackupError && e.code === 'newer';
      Alert.alert(t('common.error'), newer ? t('backup.newerVersion') : t('backup.restoreError'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [reloadAll, t]);

  return { busy, createBackup, restoreBackup };
}
