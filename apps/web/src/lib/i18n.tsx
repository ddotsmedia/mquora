'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Locale = 'ml' | 'en';

/** Core UI strings — add more as needed */
export const strings: Record<Locale, Record<string, string>> = {
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.following': 'Following',
    'nav.answers': 'Answers',
    'nav.communities': 'Communities',
    'nav.discover': 'Discover',
    'nav.topics': 'Topics',
    'nav.leaderboard': 'Leaderboard',
    'nav.ask': 'Ask',
    'nav.login': 'Login',
    'nav.signup': 'Register',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.logout': 'Sign Out',
    'nav.admin': 'Admin',
    'nav.drafts': 'Drafts',
    'nav.saved': 'Saved',
    'nav.search': 'Search questions…',
    'nav.write': 'Write an article',
    // Home / feed
    'feed.latest': 'Latest',
    'feed.top': 'Top',
    'feed.unanswered': 'Unanswered',
    'feed.foryou': 'For You',
    'feed.empty': 'No questions yet',
    // Question page
    'question.answers': 'Answers',
    'question.writeAnswer': 'Write an answer',
    'question.follow': 'Follow',
    'question.share': 'Share',
    'question.views': 'views',
    // Ask page
    'ask.title': 'Ask a Question',
    'ask.placeholder': 'What would you like to know?',
    'ask.submit': 'Post Question',
    // Common
    'common.loading': 'Loading…',
    'common.error': 'Something went wrong',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.reply': 'Reply',
    'common.vote': 'Vote',
    'common.comment': 'Comment',
  },
  ml: {
    // Navbar
    'nav.home': 'ഹോം',
    'nav.following': 'ഫോളോ ചെയ്യുന്നവ',
    'nav.answers': 'ഉത്തരങ്ങൾ',
    'nav.communities': 'കമ്മ്യൂണിറ്റികൾ',
    'nav.discover': 'കണ്ടെത്തുക',
    'nav.topics': 'വിഷയങ്ങൾ',
    'nav.leaderboard': 'ലീഡർബോർഡ്',
    'nav.ask': 'ചോദിക്കുക',
    'nav.login': 'ലോഗിൻ',
    'nav.signup': 'അക്കൗണ്ട് ഉണ്ടാക്കുക',
    'nav.notifications': 'അറിയിപ്പുകൾ',
    'nav.profile': 'പ്രൊഫൈൽ',
    'nav.settings': 'ക്രമീകരണം',
    'nav.logout': 'ലോഗൗട്ട്',
    'nav.admin': 'അഡ്മിൻ',
    'nav.drafts': 'ഡ്രാഫ്റ്റുകൾ',
    'nav.saved': 'സേവ് ചെയ്തവ',
    'nav.search': 'ചോദ്യങ്ങൾ തിരയുക…',
    'nav.write': 'ലേഖനം എഴുതുക',
    // Home / feed
    'feed.latest': 'പുതിയത്',
    'feed.top': 'മികച്ചത്',
    'feed.unanswered': 'ഉത്തരമില്ലാത്തത്',
    'feed.foryou': 'നിങ്ങൾക്കായി',
    'feed.empty': 'ഇതുവരെ ചോദ്യങ്ങൾ ഇല്ല',
    // Question page
    'question.answers': 'ഉത്തരങ്ങൾ',
    'question.writeAnswer': 'ഉത്തരം എഴുതുക',
    'question.follow': 'ഫോളോ ചെയ്യുക',
    'question.share': 'പങ്കിടുക',
    'question.views': 'കാഴ്ചകൾ',
    // Ask page
    'ask.title': 'ഒരു ചോദ്യം ചോദിക്കുക',
    'ask.placeholder': 'നിങ്ങൾക്ക് എന്ത് അറിയണം?',
    'ask.submit': 'ചോദ്യം പോസ്റ്റ് ചെയ്യുക',
    // Common
    'common.loading': 'ലോഡ് ചെയ്യുന്നു…',
    'common.error': 'എന്തോ തെറ്റ് സംഭവിച്ചു',
    'common.save': 'സേവ് ചെയ്യുക',
    'common.cancel': 'റദ്ദ് ചെയ്യുക',
    'common.delete': 'ഇല്ലാതാക്കുക',
    'common.edit': 'എഡിറ്റ് ചെയ്യുക',
    'common.reply': 'മറുപടി',
    'common.vote': 'വോട്ട്',
    'common.comment': 'കമന്റ്',
  },
};

interface I18nContext {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nContext>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
});

const STORAGE_KEY = 'askvyo-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === 'ml' || saved === 'en') setLocaleState(saved);
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback(
    (key: string) => strings[locale][key] ?? strings['en'][key] ?? key,
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

/** Language toggle button — renders 'EN | മലയാളം' chips */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${className}`}>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-0.5 rounded transition-colors ${
          locale === 'en'
            ? 'bg-[var(--primary)] text-white'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
        }`}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('ml')}
        className={`px-2 py-0.5 rounded transition-colors ${
          locale === 'ml'
            ? 'bg-[var(--primary)] text-white'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
        }`}
        aria-pressed={locale === 'ml'}
      >
        മലയാളം
      </button>
    </div>
  );
}
