import { describe, it, expect } from 'vitest';
import { StatusOperacji, StatusZlecenia } from '../constants/statusy';
import {
  OPERACJA_TRANSITIONS, ZLECENIE_TRANSITIONS, getAvailableActions,
} from '../constants/statusTransitions';

// ── Stałe statusów ───────────────────────────────────────────

describe('StatusOperacji constants', () => {
  it('has 7 unique values from 1 to 7', () => {
    const values = Object.values(StatusOperacji);
    expect(values).toHaveLength(7);
    expect(new Set(values).size).toBe(7);
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(7);
  });
});

describe('StatusZlecenia constants', () => {
  it('has 7 unique values from 1 to 7', () => {
    const values = Object.values(StatusZlecenia);
    expect(values).toHaveLength(7);
    expect(new Set(values).size).toBe(7);
  });
});

// ── Przejścia operacji ───────────────────────────────────────

describe('OPERACJA_TRANSITIONS', () => {
  describe('Osoba nadzorująca', () => {
    it('może odrzucić operację ze statusu Wprowadzone', () => {
      const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Osoba nadzorująca', StatusOperacji.WPROWADZONE);
      expect(actions.some(a => a.toStatus === StatusOperacji.ODRZUCONE)).toBe(true);
    });

    it('może potwierdzić operację do planu ze statusu Wprowadzone', () => {
      const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Osoba nadzorująca', StatusOperacji.WPROWADZONE);
      expect(actions.some(a => a.toStatus === StatusOperacji.POTWIERDZONE_DO_PLANU)).toBe(true);
    });

    it('nie ma akcji dla statusu Zrealizowane', () => {
      const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Osoba nadzorująca', StatusOperacji.ZREALIZOWANE);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Osoba planująca', () => {
    it('może rezygnować z operacji w trzech statusach', () => {
      const statusy = [
        StatusOperacji.WPROWADZONE,
        StatusOperacji.POTWIERDZONE_DO_PLANU,
        StatusOperacji.ZAPLANOWANE_DO_ZLECENIA,
      ];
      for (const s of statusy) {
        const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Osoba planująca', s);
        expect(actions).toHaveLength(1);
        expect(actions[0].toStatus).toBe(StatusOperacji.REZYGNACJA);
        expect(actions[0].danger).toBe(true);
      }
    });

    it('nie ma akcji dla statusu Odrzucone', () => {
      const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Osoba planująca', StatusOperacji.ODRZUCONE);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Nieznana rola', () => {
    it('nie ma żadnych akcji', () => {
      const actions = getAvailableActions(OPERACJA_TRANSITIONS, 'Gość', StatusOperacji.WPROWADZONE);
      expect(actions).toHaveLength(0);
    });
  });
});

// ── Przejścia zleceń ─────────────────────────────────────────

describe('ZLECENIE_TRANSITIONS', () => {
  describe('Pilot', () => {
    it('może przekazać zlecenie do akceptacji ze statusu Wprowadzone', () => {
      const actions = getAvailableActions(ZLECENIE_TRANSITIONS, 'Pilot', StatusZlecenia.WPROWADZONE);
      expect(actions).toHaveLength(1);
      expect(actions[0].toStatus).toBe(StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI);
    });

    it('ma 3 opcje zakończenia dla statusu Zaakceptowane', () => {
      const actions = getAvailableActions(ZLECENIE_TRANSITIONS, 'Pilot', StatusZlecenia.ZAAKCEPTOWANE);
      expect(actions).toHaveLength(3);
      const statuses = actions.map(a => a.toStatus);
      expect(statuses).toContain(StatusZlecenia.ZREALIZOWANE_W_CZESCI);
      expect(statuses).toContain(StatusZlecenia.ZREALIZOWANE_W_CALOSCI);
      expect(statuses).toContain(StatusZlecenia.NIE_ZREALIZOWANE);
    });

    it('nie może akceptować zleceń', () => {
      const actions = getAvailableActions(ZLECENIE_TRANSITIONS, 'Pilot', StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Osoba nadzorująca', () => {
    it('może odrzucić lub zaakceptować zlecenie do akceptacji', () => {
      const actions = getAvailableActions(ZLECENIE_TRANSITIONS, 'Osoba nadzorująca', StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI);
      expect(actions).toHaveLength(2);
      expect(actions.some(a => a.toStatus === StatusZlecenia.ODRZUCONE)).toBe(true);
      expect(actions.some(a => a.toStatus === StatusZlecenia.ZAAKCEPTOWANE)).toBe(true);
    });

    it('nie może realizować zleceń', () => {
      const actions = getAvailableActions(ZLECENIE_TRANSITIONS, 'Osoba nadzorująca', StatusZlecenia.ZAAKCEPTOWANE);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Administrator', () => {
    it('ma pełne uprawnienia — 6 reguł łącznie', () => {
      const rules = ZLECENIE_TRANSITIONS['Administrator'];
      expect(rules).toHaveLength(6);
    });

    it('może wykonać wszystkie akcje Pilota i Osoby nadzorującej', () => {
      // Przekaż do akceptacji (jak Pilot)
      const a1 = getAvailableActions(ZLECENIE_TRANSITIONS, 'Administrator', StatusZlecenia.WPROWADZONE);
      expect(a1.some(a => a.toStatus === StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI)).toBe(true);

      // Odrzuć/Zaakceptuj (jak Osoba nadzorująca)
      const a2 = getAvailableActions(ZLECENIE_TRANSITIONS, 'Administrator', StatusZlecenia.PRZEKAZANE_DO_AKCEPTACJI);
      expect(a2.some(a => a.toStatus === StatusZlecenia.ODRZUCONE)).toBe(true);
      expect(a2.some(a => a.toStatus === StatusZlecenia.ZAAKCEPTOWANE)).toBe(true);

      // Realizacja (jak Pilot)
      const a3 = getAvailableActions(ZLECENIE_TRANSITIONS, 'Administrator', StatusZlecenia.ZAAKCEPTOWANE);
      expect(a3).toHaveLength(3);
    });
  });
});

// ── getAvailableActions edge cases ───────────────────────────

describe('getAvailableActions', () => {
  it('returns empty array for unknown role', () => {
    expect(getAvailableActions(OPERACJA_TRANSITIONS, 'Nieznana rola', 1)).toEqual([]);
  });

  it('returns empty array for status with no transitions', () => {
    expect(getAvailableActions(ZLECENIE_TRANSITIONS, 'Pilot', 999)).toEqual([]);
  });

  it('all danger actions have danger=true', () => {
    for (const [, rules] of Object.entries(ZLECENIE_TRANSITIONS)) {
      for (const rule of rules) {
        if (rule.label.includes('Odrzuć') || rule.label.includes('Nie zrealizowane')) {
          expect(rule.danger).toBe(true);
        }
      }
    }
  });
});
