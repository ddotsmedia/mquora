import { LucideIcon } from 'lucide-react';

interface KPITileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
}

export default function KPITile({ icon: Icon, label, value, subtext }: KPITileProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--primary)]" />
        </div>
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      {subtext && <p className="text-xs text-[var(--text-muted)] mt-1">{subtext}</p>}
    </div>
  );
}
