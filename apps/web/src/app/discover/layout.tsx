import { DocumentLanguage } from '@/components/document-language';

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocumentLanguage lang="ml" />
      {children}
    </>
  );
}
