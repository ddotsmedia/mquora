import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <h1 className="text-5xl font-bold text-foreground mb-4">404</h1>
      <div className="space-y-2 mb-8">
        <p className="text-2xl font-semibold text-foreground">കണ്ടെത്താനായില്ല</p>
        <p className="text-xl font-semibold text-foreground">Not Found</p>
      </div>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <Link href="/" className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 inline-block">
        Back to Home
      </Link>
    </div>
  );
}
