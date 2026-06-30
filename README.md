# FinTrack — Monitor Financeiro Inteligente

App Android nativo em React Native que monitora automaticamente suas finanças via notificações bancárias.

## Como funciona

1. O app solicita permissão de **Acesso a Notificações** do Android
2. Quando chega uma notificação do seu banco (Nubank, Inter, Itaú, etc.), o `NotificationListenerService` a captura
3. O parser identifica o tipo de transação, valor e banco
4. A transação é registrada automaticamente no banco SQLite local

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native CLI 0.86 |
| Linguagem | TypeScript |
| Navegação | React Navigation 7 |
| Estado | Zustand 5 |
| Banco local | SQLite (react-native-sqlite-storage) |
| Preferências | AsyncStorage |
| UI | React Native Paper + componentes customizados |
| Animações | Reanimated 4 + Gesture Handler |
| Nativo Android | NotificationListenerService (Java) |

## Bancos suportados

- Nubank
- Banco Inter
- Itaú
- Bradesco
- Banco do Brasil
- Santander
- C6 Bank
- Caixa Econômica
- Mercado Pago
- PicPay
- Next, Neon, PagBank, Original e outros

## Estrutura do projeto

```
src/
├── models/         # Tipos TypeScript (tipos de domínio)
├── theme/          # Cores, tipografia, tema claro/escuro
├── database/
│   ├── db.ts                  # Inicialização SQLite + migrations
│   └── repositories/          # CRUD por entidade
├── store/          # Stores Zustand (estado global)
├── services/       # InsightService, ExportService
├── navigation/     # Configuração do React Navigation
├── hooks/          # useTheme e outros hooks
├── components/     # MetricCard, TransactionItem, AccountCard
├── utils/          # currency.ts, date.ts
├── constants/      # banks.ts
└── modules/
    ├── dashboard/
    ├── transactions/
    ├── accounts/
    ├── notifications/
    │   ├── parsers/    # Parser por banco (Nubank, Inter, Itaú...)
    │   ├── services/   # BankRegistry, NotificationParser
    │   └── hooks/      # useNotificationListener
    ├── goals/
    ├── budget/
    ├── insights/
    ├── settings/
    └── onboarding/

android/
└── app/src/main/java/com/fintrackapp/notification/
    ├── FinTrackNotificationService.java  # Serviço nativo Android
    ├── NotificationModule.java           # Bridge React Native ↔ Java
    └── NotificationPackage.java          # Registro do módulo
```

## Como executar

### Pré-requisitos
- Android Studio instalado
- JDK 17+
- Android SDK 34+
- Emulador ou dispositivo físico

### Instalação

```bash
# Instalar dependências
npm install

# Executar no Android
npx react-native run-android
```

### Permissão de Notificações

1. Abra o app e siga o onboarding
2. Toque em "Conceder acesso às notificações"
3. Na tela de Configurações do Android, ative o FinTrack
4. Volte ao app

## Adicionando suporte a novos bancos

1. Crie um parser em `src/modules/notifications/parsers/NovoBancoParser.ts`
2. Implemente a interface `BankParser` com o método `parse(title, body, packageName)`
3. Registre no `BankRegistry.ts` com o `packageName` correto
4. Adicione o `packageName` no array `BANK_PACKAGES` em `FinTrackNotificationService.java`

## Arquitetura do parser

```
Notificação Android
       ↓
FinTrackNotificationService.java (nativo)
       ↓ emit evento
NotificationModule.java (bridge)
       ↓ NativeEventEmitter
useNotificationListener.ts (React Native)
       ↓
NotificationParser.ts
       ↓ lookup packageName
BankRegistry.ts
       ↓ chama parser específico
NubankParser.ts / InterParser.ts / etc.
       ↓ regex extrai dados
TransactionRepository.ts (SQLite)
       ↓
Zustand Store → UI atualizada
```
