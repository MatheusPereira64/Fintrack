import { useEffect, useRef, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { processNotification, RawNotification } from '../services/NotificationParser';
import { useTransactionStore } from '../../../store/transactionStore';
import { useAccountStore }     from '../../../store/accountStore';
import { Logger }              from '../../../services/LoggerService';

const { NotificationModule } = NativeModules;
const EVENT_NAME = 'onBankNotification';

interface UseNotificationListenerOptions {
  onTransactionDetected?: (description: string, amount: number) => void;
  onError?: (error: string) => void;
}

export function useNotificationListener(options: UseNotificationListenerOptions = {}) {
  const { onTransactionDetected, onError } = options;
  const isProcessing = useRef(false);

  const { currentMonth, loadByMonth } = useTransactionStore();
  const loadAccounts = useAccountStore(s => s.loadAccounts);

  const handleNotification = useCallback(async (rawJson: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      const raw: RawNotification = JSON.parse(rawJson);
      Logger.info('NotificationListener', 'Notificação recebida', { package: raw.packageName });

      const result = await processNotification(raw);

      if (result.success && result.transaction) {
        // Recarrega dados do mês atual e contas
        await Promise.all([
          loadByMonth(currentMonth.year, currentMonth.month),
          loadAccounts(),
        ]);

        onTransactionDetected?.(
          result.transaction.description,
          result.transaction.amount,
        );

        Logger.info('NotificationListener', 'Transação registrada automaticamente', {
          desc:   result.transaction.description,
          amount: result.transaction.amount,
        });
      } else if (result.error) {
        Logger.warn('NotificationListener', result.error);
        onError?.(result.error);
      }
    } catch (e) {
      Logger.error('NotificationListener', 'Erro ao processar notificação', e);
      onError?.(String(e));
    } finally {
      isProcessing.current = false;
    }
  }, [currentMonth, loadByMonth, loadAccounts, onTransactionDetected, onError]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !NotificationModule) return;

    const emitter = new NativeEventEmitter(NotificationModule);
    const subscription = emitter.addListener(EVENT_NAME, handleNotification);

    return () => { subscription.remove(); };
  }, [handleNotification]);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !NotificationModule) return false;
    try { return await NotificationModule.hasNotificationPermission(); }
    catch { return false; }
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (Platform.OS !== 'android' || !NotificationModule) return;
    try { await NotificationModule.openNotificationSettings(); }
    catch (e) { onError?.(String(e)); }
  }, [onError]);

  return { checkPermission, requestPermission };
}
