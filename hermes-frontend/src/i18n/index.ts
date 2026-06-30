import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import zhTW from './locales/zhTW';
import zhCN from './locales/zhCN';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
  },
  lng: 'zh-TW',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
