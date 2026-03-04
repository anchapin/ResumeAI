import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { supportedLanguages } from '../i18n';

interface LanguageConfig {
  code: string;
  name: string;
  dir: string;
}

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);

    // Update document direction for RTL languages
    const langConfig = supportedLanguages.find((l: LanguageConfig) => l.code === lang);
    document.documentElement.dir = langConfig?.dir || 'ltr';
    document.documentElement.lang = lang;
  };

  return (
    <select
      value={i18n.language}
      onChange={handleLanguageChange}
      className="language-switcher"
      aria-label={t('settings.language')}
    >
      {supportedLanguages.map((lang: LanguageConfig) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
