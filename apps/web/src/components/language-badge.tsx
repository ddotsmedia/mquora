interface LanguageBadgeProps {
  language: string;
}

export function LanguageBadge({ language }: LanguageBadgeProps) {
  const badges: Record<string, { text: string; className: string }> = {
    MALAYALAM: { text: 'മലയാളം', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
    MANGLISH: { text: 'Manglish', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
    ENGLISH: { text: 'English', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100' },
    MIXED: { text: 'Mixed', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
  };

  const badge = badges[language] || badges.ENGLISH;

  return <span className={`text-xs px-2 py-1 rounded ${badge.className}`}>{badge.text}</span>;
}
