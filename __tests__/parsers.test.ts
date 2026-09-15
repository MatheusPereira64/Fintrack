import { parseNotificationAmount } from '../src/utils/notificationAmount';
import { NubankParser } from '../src/modules/notifications/parsers/NubankParser';
import { InterParser } from '../src/modules/notifications/parsers/InterParser';
import { GenericBankParser } from '../src/modules/notifications/parsers/GenericBankParser';

describe('parseNotificationAmount', () => {
  it('aceita centavos BR', () => {
    expect(parseNotificationAmount('Você recebeu R$ 1.000,00')).toBe(1000);
    expect(parseNotificationAmount('Pix de R$ 50,90')).toBe(50.9);
  });

  it('aceita valor sem centavos', () => {
    expect(parseNotificationAmount('você recebeu um pix de R$ 1000')).toBe(1000);
    expect(parseNotificationAmount('Pix de R$ 1.000')).toBe(1000);
  });
});

describe('NubankParser Pix', () => {
  it('detecta você recebeu um pix', () => {
    const r = NubankParser.parse(
      'Pix',
      'Você recebeu um pix de R$ 1000',
      'com.nu.production',
    );
    expect(r).not.toBeNull();
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(1000);
    expect(r!.category).toBe('Pix');
  });

  it('detecta Pix de R$ com centavos', () => {
    const r = NubankParser.parse('Pix', 'Pix de R$ 1.000,00', 'com.nu.production');
    expect(r!.amount).toBe(1000);
    expect(r!.type).toBe('income');
  });
});

describe('InterParser Pix', () => {
  it('detecta pix recebido sem centavos', () => {
    const r = InterParser.parse('Pix recebido', 'Você recebeu R$ 250');
    expect(r).not.toBeNull();
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(250);
  });

  it('Pix de R$ ambíguo não assume saída', () => {
    const r = InterParser.parse('Pix', 'Pix de R$ 1000');
    expect(r!.type).toBe('income');
    expect(r!.amount).toBe(1000);
  });
});

describe('GenericBankParser', () => {
  it('mapeia com.nu.production para Nubank', () => {
    const r = GenericBankParser.parse(
      'Pix',
      'Você recebeu um pix de R$ 10,00',
      'com.nu.production',
    );
    expect(r!.bankName).toBe('Nubank');
    expect(r!.type).toBe('income');
  });
});
