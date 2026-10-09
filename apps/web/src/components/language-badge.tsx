interface LanguageBadgeProps {
  language: string;
}

export function LanguageBadge({ language }: LanguageBadgeProps) {
  const badges: Record<string, { text: string; className: string }> = {
    MALAYALAM: { text: 'മലയാളം', className: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800' },
    MANGLISH: { text: 'Manglish', className: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-100 border border-orange-200 dark:border-orange-800' },
    ENGLISH: { text: 'English', className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-100 border border-blue-200 dark:border-blue-800' },
    MIXED: { text: 'Mixed', className: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-100 border border-purple-200 dark:border-purple-800' },
  };

  const badge = badges[language] || badges.ENGLISH;

  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.text}</span>;
}
