// ── Statusy operacji lotniczych ──────────────────────────────

export const StatusOperacji = {
  WPROWADZONE:            1,
  ODRZUCONE:              2,
  POTWIERDZONE_DO_PLANU:  3,
  ZAPLANOWANE_DO_ZLECENIA:4,
  CZESCIOWO_ZREALIZOWANE: 5,
  ZREALIZOWANE:           6,
  REZYGNACJA:             7,
} as const;

// ── Statusy zleceń na lot ───────────────────────────────────

export const StatusZlecenia = {
  WPROWADZONE:             1,
  PRZEKAZANE_DO_AKCEPTACJI:2,
  ODRZUCONE:               3,
  ZAAKCEPTOWANE:           4,
  ZREALIZOWANE_W_CZESCI:   5,
  ZREALIZOWANE_W_CALOSCI:  6,
  NIE_ZREALIZOWANE:        7,
} as const;
