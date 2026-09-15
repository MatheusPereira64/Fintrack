import type { AppIconName } from '../components/Icon';

/** Mapeia nome de categoria (ou legado emoji) para ícone outline limpo. */
export function resolveCategoryIcon(
  nameOrEmoji?: string,
  fallback: AppIconName = 'tag',
): AppIconName {
  if (!nameOrEmoji) return fallback;
  const key = nameOrEmoji
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const byName: Array<[RegExp, AppIconName]> = [
    [/aliment|mercado|restaurante|delivery|comida|food/, 'food'],
    [/transporte|combust|uber|99|gasolina|carro/, 'transport'],
    [/moradia|aluguel|casa|home/, 'home'],
    [/conta|luz|agua|energia|internet/, 'bill'],
    [/saude|farmacia|medico|hospital/, 'health'],
    [/educa|curso|escola|faculdade/, 'education'],
    [/lazer|stream|game|cinema|entreten/, 'entertainment'],
    [/vestuar|roupa|shopping|compra/, 'shopping'],
    [/pix|ted|doc|transfer/, 'pix'],
    [/boleto/, 'boleto'],
    [/debito|credito|cartao/, 'card'],
    [/saque|cash/, 'cash'],
    [/deposito|salario|renda|receita/, 'income'],
    [/estorno/, 'refresh'],
    [/invest/, 'investment'],
    [/outros|outro/, 'tag'],
  ];

  for (const [re, icon] of byName) {
    if (re.test(key)) return icon;
  }

  return fallback;
}
