/**
 * Wrapper central de ícones usando MaterialCommunityIcons.
 * Mapeia nomes semânticos do app para ícones do pacote.
 */
import React, { memo } from 'react';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Nomes semânticos usados no app ──────────────────────────────────────────
export type AppIconName =
  // Navegação
  | 'home' | 'home-active'
  | 'transactions' | 'transactions-active'
  | 'accounts' | 'accounts-active'
  | 'more' | 'more-active'
  // Ações
  | 'add' | 'edit' | 'delete' | 'close' | 'back' | 'forward' | 'check'
  | 'filter' | 'sort' | 'search' | 'refresh' | 'share'
  // Finanças
  | 'income' | 'expense' | 'transfer' | 'pix' | 'boleto'
  | 'wallet' | 'card' | 'savings' | 'investment' | 'cash'
  | 'chart-pie' | 'chart-bar' | 'chart-line' | 'trending-up' | 'trending-down'
  // Status / Info
  | 'info' | 'warning' | 'error' | 'success' | 'bell' | 'bell-active'
  | 'eye' | 'eye-off' | 'lock' | 'settings' | 'logout'
  // Misc
  | 'calendar' | 'clock' | 'tag' | 'label' | 'star' | 'heart'
  | 'download' | 'upload' | 'file' | 'export' | 'import'
  | 'goal' | 'budget' | 'insights' | 'auto' | 'category'
  | 'check-circle' | 'dots-vertical' | 'repeat' | 'currency'
  | 'bank' | 'credit-card' | 'qr-code' | 'notification-dot';

const MAP: Record<AppIconName, string> = {
  // Navegação
  home:                'home-outline',
  'home-active':       'home',
  transactions:        'swap-horizontal',
  'transactions-active': 'swap-horizontal-bold',
  accounts:            'bank-outline',
  'accounts-active':   'bank',
  more:                'dots-grid',
  'more-active':       'dots-grid',
  // Ações
  add:                 'plus',
  edit:                'pencil-outline',
  delete:              'trash-can-outline',
  close:               'close',
  back:                'chevron-left',
  forward:             'chevron-right',
  check:               'check',
  filter:              'tune-variant',
  sort:                'sort-variant',
  search:              'magnify',
  refresh:             'refresh',
  share:               'share-variant-outline',
  // Finanças
  income:              'arrow-down-circle-outline',
  expense:             'arrow-up-circle-outline',
  transfer:            'bank-transfer',
  pix:                 'lightning-bolt-outline',
  boleto:              'barcode-scan',
  wallet:              'wallet-outline',
  card:                'credit-card-outline',
  'credit-card':       'credit-card-outline',
  savings:             'piggy-bank-outline',
  investment:          'trending-up',
  cash:                'cash-multiple',
  'chart-pie':         'chart-donut',
  'chart-bar':         'chart-bar',
  'chart-line':        'chart-line',
  'trending-up':       'trending-up',
  'trending-down':     'trending-down',
  // Status
  info:                'information-outline',
  warning:             'alert-outline',
  error:               'alert-circle-outline',
  success:             'check-circle-outline',
  bell:                'bell-outline',
  'bell-active':       'bell',
  eye:                 'eye-outline',
  'eye-off':           'eye-off-outline',
  lock:                'lock-outline',
  settings:            'cog-outline',
  logout:              'logout',
  // Misc
  calendar:            'calendar-outline',
  clock:               'clock-outline',
  tag:                 'tag-outline',
  label:               'label-outline',
  star:                'star-outline',
  heart:               'heart-outline',
  download:            'download-outline',
  upload:              'upload-outline',
  file:                'file-document-outline',
  export:              'export-variant',
  import:              'import',
  goal:                'flag-checkered',
  budget:              'clipboard-text-outline',
  insights:            'lightbulb-outline',
  auto:                'robot-outline',
  category:            'shape-outline',
  'check-circle':      'check-circle-outline',
  'dots-vertical':     'dots-vertical',
  repeat:              'repeat',
  currency:            'currency-brl',
  bank:                'bank-outline',
  'qr-code':           'qrcode',
  'notification-dot':  'record-circle',
};

interface IconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: object;
}

export const Icon = memo(function Icon({ name, size = 22, color = '#6B7280', style }: IconProps) {
  return <MCI name={MAP[name]} size={size} color={color} style={style} />;
});
