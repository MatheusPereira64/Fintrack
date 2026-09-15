import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { getDatabase }            from './database/db';
import { useSettingsStore }       from './store/settingsStore';
import { useAccountStore }        from './store/accountStore';
import { useCategoryStore }       from './store/categoryStore';
import { useTransactionStore }    from './store/transactionStore';
import { useBudgetStore }         from './store/budgetStore';
import { useGoalStore }           from './store/goalStore';
import { AppNavigator }           from './navigation/AppNavigator';
import { Logger }                 from './services/LoggerService';
import { Logo }                   from './components/Logo';
import { NotificationManager }    from './services/NotificationManager';
import { RecurringService }       from './services/RecurringService';
import { UpdateService }          from './services/UpdateService';

type BootstrapStatus = 'loading' | 'ready' | 'error';

export default function App() {
  const [status, setStatus] = useState<BootstrapStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const loadSettings    = useSettingsStore(s => s.loadSettings);
  const loadAccounts    = useAccountStore(s => s.loadAccounts);
  const loadCategories  = useCategoryStore(s => s.loadCategories);
  const { loadByMonth, loadMonthlyTotals } = useTransactionStore();
  const loadBudgets     = useBudgetStore(s => s.loadBudgets);
  const loadGoals       = useGoalStore(s => s.loadGoals);

  useEffect(() => {
    let cancelled = false;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;

    async function bootstrap() {
      try {
        await getDatabase();
        Logger.info('App', 'Banco de dados inicializado');

        await loadSettings();

        const now = new Date();
        await Promise.all([
          loadAccounts(),
          loadCategories(),
          loadByMonth(now.getFullYear(), now.getMonth() + 1),
          loadBudgets(),
          loadGoals(),
        ]);

        loadMonthlyTotals();

        RecurringService.processCurrentMonth().then(n => {
          if (n > 0 && !cancelled) {
            loadByMonth(now.getFullYear(), now.getMonth() + 1);
          }
        });

        Logger.info('App', 'Bootstrap concluído');
        NotificationManager.start();
        if (cancelled) return;
        setStatus('ready');

        updateTimer = setTimeout(() => {
          UpdateService.checkOnLaunch().catch(err => {
            Logger.warn('App', 'Checagem de update ignorada', err);
          });
        }, 1500);
      } catch (err) {
        Logger.error('App', 'Falha no bootstrap', err);
        if (!cancelled) {
          setErrorMsg(String(err));
          setStatus('error');
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (updateTimer) clearTimeout(updateTimer);
    };
  }, []);

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <Logo size={96} />
        <Text style={styles.splashTitle}>FinTrack</Text>
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.splash}>
        <Text style={[styles.splashTitle, { color: '#EF4444' }]}>Erro ao inicializar</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#120A24',
    justifyContent: 'center', alignItems: 'center',
  },
  splashTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  errorText:   { fontSize: 13, color: '#6B7280', marginTop: 8, paddingHorizontal: 32, textAlign: 'center' },
});
