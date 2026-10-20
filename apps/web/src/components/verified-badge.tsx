// Small check mark shown next to verified experts.
export function VerifiedBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span title="Verified expert" className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] text-white align-middle">
      ✓
    </span>
  );
}
