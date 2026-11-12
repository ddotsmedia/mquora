import { DocumentLanguage } from '@/components/document-language';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocumentLanguage lang="ml" />
      {children}
    </>
  );
}
