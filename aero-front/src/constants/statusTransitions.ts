import { StatusOperacji, StatusZlecenia } from './statusy';

/**
 * Reguła przejścia statusu — czyste dane bez JSX.
 * Komponenty UI dodają ikony i style na podstawie tych reguł.
 */
export interface StatusTransitionRule {
  fromStatus: number;
  toStatus:   number;
  label:      string;
  danger?:    boolean;
}

// ── Przejścia statusów operacji per rola ─────────────────────

export const OPERACJA_TRANSITIONS: Record<string, StatusTransitionRule[]> = {
  'Osoba nadzorująca': [
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.ODRZUCONE,            label: 'Odrzuć',             danger: true },
    { fromStatus: StatusOperacji.WPROWADZONE, toStatus: StatusOperacji.POTWIERDZONE_DO_PLANU, label: 'Potwierdź do planu' },
  ],
  'Osoba planująca': [
    { fromStatus: StatusOperacji.WPROWADZONE,             toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true },
    { fromStatus: StatusOperacji.POTWIERDZONE_DO_PLANU,   toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true },
    { fromStatus: StatusOperacji.ZAPLANOWANE_DO_ZLECENIA, toStatus: StatusOperacji.REZYGNACJA, label: 'Rezygnuj', danger: true },
  ],
};

// ── Przejścia statusów zleceń per rola ───────────────────────

export const ZLECENIE_TRANSITIONS: Record<string, StatusTransitionRule[]> = {
  'Pilot': [
    { fromStatus: StatusZlecenia.WPROWADZONE,   toStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.ZREALIZOWANE_W_CZESCI,    label: 'Zrealizowane w części' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.ZREALIZOWANE_W_CALOSCI,   label: 'Zrealizowane w całości' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,  toStatus: StatusZlecenia.NIE_ZREALIZOWANE,         label: 'Nie zrealizowane',       danger: true },
  ],
  'Osoba nadzorująca': [
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ODRZUCONE,    label: 'Odrzuć',     danger: true },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ZAAKCEPTOWANE, label: 'Zaakceptuj' },
  ],
  'Administrator': [
    { fromStatus: StatusZlecenia.WPROWADZONE,              toStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, label: 'Przekaż do akceptacji' },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ODRZUCONE,                label: 'Odrzuć',                danger: true },
    { fromStatus: StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI, toStatus: StatusZlecenia.ZAAKCEPTOWANE,             label: 'Zaakceptuj' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.ZREALIZOWANE_W_CZESCI,     label: 'Zrealizowane w części' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.ZREALIZOWANE_W_CALOSCI,    label: 'Zrealizowane w całości' },
    { fromStatus: StatusZlecenia.ZAAKCEPTOWANE,            toStatus: StatusZlecenia.NIE_ZREALIZOWANE,          label: 'Nie zrealizowane',       danger: true },
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
