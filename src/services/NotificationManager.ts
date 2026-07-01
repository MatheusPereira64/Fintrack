/**
 * NotificationManager — Singleton global de captura de notificações bancárias.
 *
 * Montado uma única vez no App.tsx, elimina o risco de múltiplas instâncias
 * do hook useNotificationListener registrando o mesmo evento ao mesmo tempo.
 *
 * Expõe:
 *  - start()  : registra o listener nativo
 *  - stop()   : remove o listener
 *  - addObserver() / removeObserver() : callbacks externos (ex: toast no dashboard)
 */
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { processNotification, RawNotification } from '../modules/notifications/services/NotificationParser';
import { TransactionRepository }                from '../database/repositories/TransactionRepository';
import { NotificationRepository }               from '../database/repositories/NotificationRepository';
import { BudgetRepository }                     from '../database/repositories/BudgetRepository';
import { Logger }                               from './LoggerService';

const { NotificationModule } = NativeModules;
const EVENT_NAME              = 'onBankNotification';

export interface TransactionEvent {
  description: string;
  amount:      number;
  bankName:    string;
}

type Observer = (event: TransactionEvent) => void;

class _NotificationManager {
  private subscription: ReturnType<NativeEventEmitter['addListener']> | null = null;
  private emitter:      NativeEventEmitter | null = null;
  private processing    = false;
  private queue:         string[] = [];
  private observers     = new Set<Observer>();

  start() {
    if (Platform.OS !== 'android' || !NotificationModule) return;
    if (this.subscription) return; // já iniciado

    this.emitter      = new NativeEventEmitter(NotificationModule);
    this.subscription = this.emitter.addListener(EVENT_NAME, this.handleRaw);
    Logger.info('NotificationManager', 'Listener iniciado');
  }

  stop() {
    this.subscription?.remove();
    this.subscription = null;
    Logger.info('NotificationManager', 'Listener parado');
  }

  addObserver(fn: Observer)    { this.observers.add(fn); }
  removeObserver(fn: Observer) { this.observers.delete(fn); }

  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NotificationModule) return false;
    try { return await NotificationModule.hasNotificationPermission(); }
    catch { return false; }
  }

  async openSettings(): Promise<void> {
    if (Platform.OS !== 'android' || !NotificationModule) return;
    try { await NotificationModule.openNotificationSettings(); }
    catch {}
  }

  // ── Handler interno ────────────────────────────────────────────────────────
  private handleRaw = (rawJson: string) => {
    this.queue.push(rawJson);
    void this.drainQueue();
  };

  private async drainQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const rawJson = this.queue.shift()!;
      try {
        const raw: RawNotification = JSON.parse(rawJson);
        Logger.info('NotificationManager', 'Notificação recebida', {
          pkg: raw.packageName, title: raw.title, text: raw.text?.slice(0, 120),
        });

        const result = await processNotification(raw);

        if (result.ignored) {
          Logger.warn('NotificationManager', 'Parser não reconheceu a notificação', {
            pkg: raw.packageName, title: raw.title, text: raw.text,
          });
        } else if (result.success && result.transaction) {
          const tx = result.transaction;
          Logger.info('NotificationManager', 'Transação automática', { desc: tx.description, amount: tx.amount });

          await this.checkBudgetAlert(result.categoryId, tx.amount);

          const event: TransactionEvent = {
            description: tx.description,
            amount:      Math.abs(tx.amount),
            bankName:    tx.bankName,
          };
          this.observers.forEach(fn => fn(event));
        } else if (result.error) {
          Logger.warn('NotificationManager', 'Falha ao processar notificação', { error: result.error });
        }
      } catch (e) {
        Logger.error('NotificationManager', 'Erro ao processar notificação', e);
      }
    }

    this.processing = false;
  };

  // ── Alerta de orçamento excedido ────────────────────────────────────────────
  private async checkBudgetAlert(categoryId: number | undefined, amount: number) {
    if (amount >= 0 || !categoryId) return; // só despesas com categoria
    try {
      const budgets = await BudgetRepository.findAll();

      for (const budget of budgets) {
        if (budget.categoryId !== categoryId) continue;

        const categoryLabel = budget.categoryName ?? 'categoria';
        const newSpent = (budget.spent ?? 0) + Math.abs(amount);
        if (newSpent > budget.amount && (budget.spent ?? 0) <= budget.amount) {
          await NotificationRepository.insert({
            type:    'budget_alert',
            title:   'Orçamento excedido',
            message: `Você ultrapassou o orçamento de ${categoryLabel}: R$ ${budget.amount.toFixed(2).replace('.', ',')}`,
            metadata: JSON.stringify({ categoryName: categoryLabel, budgetId: budget.id }),
          });
          Logger.warn('NotificationManager', `Orçamento excedido: ${categoryLabel}`);
        }
      }
    } catch {}
  }
}

export const NotificationManager = new _NotificationManager();
