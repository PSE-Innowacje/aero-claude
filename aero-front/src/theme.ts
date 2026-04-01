// ── Design tokens ────────────────────────────────────────────
// Single source of truth for all colors, spacing, and style constants.

export const palette = {
  // Base backgrounds (darkest → lightest)
  bgDeep:      '#080f1a',
  bgBase:      '#0f1e30',
  bgElevated:  '#162840',
  bgLogin:     '#0D0D14',

  // Borders
  border:      '#1e3a5c',
  borderLight: '#2A2A3A',

  // Text
  text:        '#e8eef6',
  textMuted:   '#7a9abf',
  textDimmed:  '#3a5a80',
  textFaint:   '#1e3a5c',

  // Brand gradient endpoints
  brandBlue:   '#1a5fa8',
  brandRed:    '#a71e2d',

  // UI accents
  success:     '#52c41a',
  successBg:   'rgba(82,196,26,0.08)',
  successBorder: 'rgba(82,196,26,0.3)',
  successText: '#389e0d',
  errorText:   '#d4626e',
  errorBg:     'rgba(167,30,45,0.12)',
  errorBorder: '#a71e2d',
  infoBg:      'rgba(26,95,168,0.14)',
  infoText:    '#7ab4e0',

  // Sidebar / overlay alpha
  sidebarHover:    'rgba(255,255,255,0.18)',
  sidebarDivider:  'rgba(255,255,255,0.10)',
  sidebarUserBg:   'rgba(255,255,255,0.07)',
  sidebarUserBorder: 'rgba(255,255,255,0.10)',

  white:       '#ffffff',
} as const;

export const gradients = {
  sidebar: 'linear-gradient(180deg, #1a5fa8 0%, #17407a 40%, #8b1822 75%, #a71e2d 100%)',
  brand:   'linear-gradient(135deg, #1a5fa8 0%, #a71e2d 100%)',
  avatar:  'linear-gradient(135deg, #1a5fa8, #a71e2d)',
  logo:    'linear-gradient(135deg, #6C47FF 0%, #a78bfa 100%)',

  // Form pages
  formNew:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  formEdit:  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  zlecenieNew:  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  zlecenieEdit: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  operacje:  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 18,
  round: 20,
} as const;

export const fontFamily = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
export const fontFamilyDisplay = 'Syne, sans-serif';

// ── Ant Design theme config ──────────────────────────────────

export const antdThemeToken = {
  colorPrimary:      palette.brandBlue,
  borderRadius:      radii.md,
  colorBgContainer:  palette.bgBase,
  colorBgElevated:   palette.bgElevated,
  colorBgLayout:     palette.bgDeep,
  colorBorder:       palette.border,
  colorText:         palette.text,
  colorTextSecondary: palette.textMuted,
  fontFamily,
} as const;
