// Seasonal theme presets. Values are HSL triplets for the shadcn/Tailwind CSS variables.
// "default" intentionally overrides nothing. The backend keeps a matching allow-list
// (THEME_PRESETS in app/services/settings_service.py).

export const THEME_VARIABLES = [
  ['--primary', 'primary'],
  ['--primary-foreground', 'primaryForeground'],
  ['--secondary', 'secondary'],
  ['--secondary-foreground', 'secondaryForeground'],
  ['--accent', 'accent'],
  ['--accent-foreground', 'accentForeground'],
  ['--background', 'background'],
];

export const THEME_PRESETS = {
  default: {
    label: 'Default',
    description: 'The standard look.',
    decoration: null,
    swatch: ['#0f172a', '#e2e8f0', '#10b981'],
    light: null,
    dark: null,
    header: null,
  },
  ramadan: {
    label: 'Ramadan',
    description: 'Deep green and gold with a crescent and lanterns.',
    decoration: 'ramadan',
    swatch: ['#0b5d3f', '#fdf1c7', '#f5c542'],
    light: {
      primary: '160 84% 20%', primaryForeground: '0 0% 100%',
      secondary: '45 80% 92%', secondaryForeground: '160 60% 12%',
      accent: '45 90% 85%', accentForeground: '160 60% 12%',
      background: '45 40% 98%',
    },
    dark: {
      primary: '45 90% 60%', primaryForeground: '160 80% 8%',
      secondary: '160 30% 16%', secondaryForeground: '45 40% 95%',
      accent: '45 60% 22%', accentForeground: '45 40% 95%',
      background: '160 30% 7%',
    },
    header: { light: ['160 70% 30% / 0.16', '45 90% 55% / 0.10'], dark: ['160 60% 30% / 0.35', '45 80% 40% / 0.18'] },
  },
  eid: {
    label: 'Eid',
    description: 'Violet and gold with a festive pattern.',
    decoration: 'eid',
    swatch: ['#6b21a8', '#f5e8ff', '#f5c542'],
    light: {
      primary: '280 60% 35%', primaryForeground: '0 0% 100%',
      secondary: '300 40% 94%', secondaryForeground: '280 60% 15%',
      accent: '45 90% 88%', accentForeground: '280 60% 15%',
      background: '300 30% 98%',
    },
    dark: {
      primary: '280 80% 78%', primaryForeground: '280 60% 10%',
      secondary: '280 30% 18%', secondaryForeground: '300 40% 96%',
      accent: '45 50% 24%', accentForeground: '45 40% 95%',
      background: '280 30% 8%',
    },
    header: { light: ['280 60% 45% / 0.16', '45 90% 55% / 0.12'], dark: ['280 50% 35% / 0.35', '45 70% 40% / 0.18'] },
  },
  independence_day: {
    label: 'Independence Day',
    description: 'Saffron, white and green with navy accents.',
    decoration: 'festive',
    swatch: ['#1e3a8a', '#ffedd5', '#16a34a'],
    light: {
      primary: '225 70% 30%', primaryForeground: '0 0% 100%',
      secondary: '140 40% 92%', secondaryForeground: '225 70% 15%',
      accent: '30 100% 90%', accentForeground: '225 70% 15%',
      background: '30 30% 99%',
    },
    dark: {
      primary: '30 95% 62%', primaryForeground: '225 60% 10%',
      secondary: '140 25% 16%', secondaryForeground: '30 30% 96%',
      accent: '225 40% 22%', accentForeground: '30 30% 96%',
      background: '225 35% 8%',
    },
    header: { light: ['30 100% 55% / 0.16', '140 60% 35% / 0.12'], dark: ['30 90% 45% / 0.28', '140 50% 30% / 0.25'] },
  },
  campaign_drive: {
    label: 'Campaign drive',
    description: 'Warm orange for fundraising pushes.',
    decoration: 'campaign',
    swatch: ['#9a3412', '#ffedd5', '#fbbf24'],
    light: {
      primary: '12 80% 38%', primaryForeground: '0 0% 100%',
      secondary: '24 90% 94%', secondaryForeground: '12 70% 16%',
      accent: '45 100% 88%', accentForeground: '12 70% 16%',
      background: '24 40% 98%',
    },
    dark: {
      primary: '20 90% 65%', primaryForeground: '12 60% 10%',
      secondary: '12 30% 17%', secondaryForeground: '24 40% 96%',
      accent: '45 50% 22%', accentForeground: '24 40% 96%',
      background: '12 30% 8%',
    },
    header: { light: ['12 80% 50% / 0.16', '45 100% 55% / 0.12'], dark: ['12 70% 40% / 0.32', '45 80% 40% / 0.18'] },
  },
};

export const THEME_IDS = Object.keys(THEME_PRESETS);

export const resolveThemeId = (id) => (THEME_PRESETS[id] ? id : 'default');

const block = (selector, values, header) => {
  if (!values) return '';
  const lines = THEME_VARIABLES.map(([cssVar, key]) => `${cssVar}: ${values[key]};`);
  if (header) {
    lines.push(`--theme-header-gradient: linear-gradient(90deg, hsl(${header[0]}), hsl(${header[1]}));`);
  }
  return `${selector} { ${lines.join(' ')} }`;
};

// CSS for light and dark mode; empty for the default theme so nothing is overridden.
// html:root / html.dark outrank the plain :root / .dark rules in Layout.jsx.
export function buildThemeCss(id) {
  const preset = THEME_PRESETS[resolveThemeId(id)];
  if (!preset.light) return '';
  return [
    block('html:root', preset.light, preset.header?.light),
    block('html.dark', preset.dark, preset.header?.dark),
  ].join('\n');
}
