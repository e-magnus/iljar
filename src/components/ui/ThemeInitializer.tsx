'use client';

import { useEffect } from 'react';

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'is' | 'en';
export type AppStartPage = '/dashboard' | '/appointments' | '/clients';
export type AppDensity = 'comfortable' | 'compact';
export type AppFontSize = 'small' | 'medium' | 'large';

const THEME_STORAGE_KEY = 'iljar-theme';
const LANGUAGE_STORAGE_KEY = 'iljar-language';
const START_PAGE_STORAGE_KEY = 'iljar-start-page';
const DENSITY_STORAGE_KEY = 'iljar-density';
const FONT_SIZE_STORAGE_KEY = 'iljar-font-size';

const DEFAULT_THEME: AppTheme = 'light';
const DEFAULT_LANGUAGE: AppLanguage = 'is';
const DEFAULT_START_PAGE: AppStartPage = '/dashboard';
const DEFAULT_DENSITY: AppDensity = 'comfortable';
const DEFAULT_FONT_SIZE: AppFontSize = 'small';

const fontSizeToRootValue: Record<AppFontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

export function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = language;
}

export function applyDensity(density: AppDensity) {
  document.documentElement.setAttribute('data-density', density);
}

export function applyFontSize(fontSize: AppFontSize) {
  document.documentElement.setAttribute('data-font-size', fontSize);
  document.documentElement.style.fontSize = fontSizeToRootValue[fontSize];
}

export function resolveStoredTheme(): AppTheme {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'dark' ? 'dark' : DEFAULT_THEME;
}

export function resolveStoredLanguage(): AppLanguage {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === 'en' ? 'en' : DEFAULT_LANGUAGE;
}

export function resolveStoredStartPage(): AppStartPage {
  const savedStartPage = window.localStorage.getItem(START_PAGE_STORAGE_KEY);
  if (savedStartPage === '/appointments' || savedStartPage === '/clients' || savedStartPage === '/dashboard') {
    return savedStartPage;
  }

  return DEFAULT_START_PAGE;
}

export function resolveStoredDensity(): AppDensity {
  const savedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return savedDensity === 'compact' ? 'compact' : DEFAULT_DENSITY;
}

export function resolveStoredFontSize(): AppFontSize {
  const savedFontSize = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  if (savedFontSize === 'small' || savedFontSize === 'large') {
    return savedFontSize;
  }

  return DEFAULT_FONT_SIZE;
}

export function ThemeInitializer() {
  useEffect(() => {
    applyTheme(resolveStoredTheme());
    applyLanguage(resolveStoredLanguage());
    applyDensity(resolveStoredDensity());
    applyFontSize(resolveStoredFontSize());
  }, []);

  return null;
}

export {
  THEME_STORAGE_KEY,
  LANGUAGE_STORAGE_KEY,
  START_PAGE_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
  FONT_SIZE_STORAGE_KEY,
  DEFAULT_THEME,
  DEFAULT_LANGUAGE,
  DEFAULT_START_PAGE,
  DEFAULT_DENSITY,
  DEFAULT_FONT_SIZE,
};
