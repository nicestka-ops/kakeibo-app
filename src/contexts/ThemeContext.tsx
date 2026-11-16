import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export type AccentColor = 'purple' | 'violet' | 'pink' | 'blue';

export interface AccentColorPreset {
  id: AccentColor;
  label: string;
  swatchHex: string;
  shades: Record<string, string>;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  {
    id: 'purple',
    label: 'パープル',
    swatchHex: '#9333ea',
    shades: {
      50: '250 245 255',
      100: '243 232 255',
      200: '233 213 255',
      300: '216 180 254',
      400: '192 132 252',
      500: '168 85 247',
      600: '147 51 234',
      700: '126 34 206',
      800: '107 33 168',
      900: '88 28 135',
      950: '59 7 100',
    },
  },
  {
    id: 'violet',
    label: 'バイオレット',
    swatchHex: '#7c3aed',
    shades: {
      50: '245 243 255',
      100: '237 233 254',
      200: '221 214 254',
      300: '196 181 253',
      400: '167 139 250',
      500: '139 92 246',
      600: '124 58 237',
      700: '109 40 217',
      800: '91 33 182',
      900: '76 29 149',
      950: '46 16 101',
    },
  },
  {
    id: 'pink',
    label: 'ピンク',
    swatchHex: '#ec4899',
    shades: {
      50: '253 242 248',
      100: '252 231 243',
      200: '251 207 232',
      300: '249 168 212',
      400: '244 114 182',
      500: '236 72 153',
      600: '219 39 119',
      700: '190 24 93',
      800: '157 23 77',
      900: '131 24 67',
      950: '80 7 36',
    },
  },
  {
    id: 'blue',
    label: 'ブルー',
    swatchHex: '#3b82f6',
    shades: {
      50: '239 246 255',
      100: '219 234 254',
      200: '191 219 254',
      300: '147 197 253',
      400: '96 165 250',
      500: '59 130 246',
      600: '37 99 235',
      700: '29 78 216',
      800: '30 64 175',
      900: '30 58 138',
      950: '23 37 84',
    },
  },
];

export type CustomColorKey = 'summary' | 'income' | 'expense' | 'assets' | 'planned' | 'budget';

export type CustomColors = Record<CustomColorKey, string>;

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  summary: '#3B82F6',
  income: '#10B981',
  expense: '#EC4899',
  assets: '#7047FF',
  planned: '#F59E0B',
  budget: '#22C55E',
};

export const CUSTOM_COLOR_META: Array<{
  key: CustomColorKey;
  label: string;
  description: string;
}> = [
  { key: 'summary', label: '今月の収支', description: 'ホームの収支カード' },
  { key: 'income', label: '収入', description: '収入の金額・グラフ' },
  { key: 'expense', label: '支出', description: '支出の金額・グラフ' },
  { key: 'assets', label: '口座・資産残高', description: '残高・総資産・利用可能額' },
  { key: 'planned', label: '支払い予定', description: '支払い予定・カード引き落とし' },
  { key: 'budget', label: '予算・達成率', description: '予算ゲージ・消化率' },
];

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  accentColor: AccentColor;
  customColors: CustomColors;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setCustomColor: (key: CustomColorKey, hex: string) => void;
  resetCustomColors: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CUSTOM_COLORS_STORAGE_KEY = 'kakeibo_custom_colors_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('kakeibo_theme') as Theme | null;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'light';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('kakeibo_accent_color') as AccentColor | null;
    return ACCENT_COLOR_PRESETS.some((p) => p.id === saved) && saved ? saved : 'blue';
  });

  const [customColors, setCustomColors] = useState<CustomColors>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_CUSTOM_COLORS;
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const activeDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      setIsDark(activeDark);
      if (activeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('kakeibo_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    const preset =
      ACCENT_COLOR_PRESETS.find((p) => p.id === accentColor) || ACCENT_COLOR_PRESETS[3];
    const root = document.documentElement;
    for (const [shade, rgb] of Object.entries(preset.shades)) {
      root.style.setProperty(`--accent-${shade}`, rgb);
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', preset.swatchHex);
    }
    localStorage.setItem('kakeibo_accent_color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-summary', customColors.summary);
    root.style.setProperty('--color-income', customColors.income);
    root.style.setProperty('--color-expense', customColors.expense);
    root.style.setProperty('--color-assets', customColors.assets);
    root.style.setProperty('--color-planned', customColors.planned);
    root.style.setProperty('--color-budget', customColors.budget);
    localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(customColors));
  }, [customColors]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
  };

  const setCustomColor = (key: CustomColorKey, hex: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: hex }));
  };

  const resetCustomColors = () => {
    setCustomColors(DEFAULT_CUSTOM_COLORS);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        accentColor,
        customColors,
        setTheme,
        setAccentColor,
        setCustomColor,
        resetCustomColors,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
