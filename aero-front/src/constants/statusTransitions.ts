import { StatusOperacji, StatusZlecenia } from './statusy';

/**
 * Reguła przejścia statusu — czyste dane bez JSX.
 * `iconName` odpowiada nazwie ikony z @ant-design/icons (mapowanej w UI).
 * `buttonType` odpowiada antd Button `type` prop.
 */
export interface StatusTransitionRule {
  fromStatus:   number;
  toStatus:     number;
  label:        string;
  danger?:      boolean;
  buttonType?:  'primary' | 'default';
  iconName?:    'check' | 'close' | 'stop' | 'rocket' | 'checkCircle' | 'minusCircle';
}

// ── Przejścia statusów operacji per rola ─────────────────────

export const OPERACJA_TRANSITIONS: Record<string, StatusTransitionRule[]> = {
  'Osoba nadzorująca': [
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.ODRZUCONE,            label: 'Odrzuć',             danger: true,  iconName: 'close' },
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.POTWIERDZONE_DO_PLANU, label: 'Potwierdź do planu', buttonType: 'primary', iconName: 'check' },
  ],
  'Osoba planująca': [
    { fromStatus: StatusOperacji.WPROWADZONE,             toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, iconName: 'stop' },
    { fromStatus: StatusOperacji.POTWIERDZONE_DO_PLANU,   toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, iconName: 'stop' },
    { fromStatus: StatusOperacji.ZAPLANOWANE_DO_ZLECENIA, toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true, iconName: 'stop' },
  ],
};

// ── Przejścia statusów zleceń per rola ───────────────────────

export const ZLECENIE_TRANSITIONS: Record<string, StatusTransitionRule[]> = {
  'Pilot': [
    { fromStatus: StatusZlecenia.WPROWADZONE,   toStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji', buttonType: 'primary', iconName: 'rocket' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.ZREALIZOWANE_W_CZESCI,    label: 'Zrealizowane w części',  buttonType: 'primary', iconName: 'check' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.ZREALIZOWANE_W_CALOSCI,   label: 'Zrealizowane w całości', buttonType: 'primary', iconName: 'checkCircle' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.NIE_ZREALIZOWANE,         label: 'Nie zrealizowane',       danger: true,         iconName: 'minusCircle' },
  ],
  'Osoba nadzorująca': [
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ODRZUCONE,    label: 'Odrzuć',     danger: true,         iconName: 'close' },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ZAAKCEPTOWANE, label: 'Zaakceptuj', buttonType: 'primary', iconName: 'check' },
  ],
  'Administrator': [
    { fromStatus: StatusZlecenia.WPROWADZONE,              toStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji', buttonType: 'primary', iconName: 'rocket' },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ODRZUCONE,                label: 'Odrzuć',                danger: true,         iconName: 'close' },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ZAAKCEPTOWANE,             label: 'Zaakceptuj',            buttonType: 'primary', iconName: 'check' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.ZREALIZOWANE_W_CZESCI,     label: 'Zrealizowane w części',  buttonType: 'primary', iconName: 'check' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.ZREALIZOWANE_W_CALOSCI,    label: 'Zrealizowane w całości', buttonType: 'primary', iconName: 'checkCircle' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.NIE_ZREALIZOWANE,          label: 'Nie zrealizowane',       danger: true,         iconName: 'minusCircle' },
  ],
};

/**
 * Zwraca dostępne akcje zmiany statusu dla danej roli i aktualnego statusu.
 */
export function getAvailableActions(
  transitions: Record<string, StatusTransitionRule[]>,
  rola: string,
  currentStatus: number,
): StatusTransitionRule[] {
  return (transitions[rola] ?? []).filter(a => a.fromStatus === currentStatus);
}
