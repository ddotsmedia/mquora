'use client';

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text)]">Platform Config</h2>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Platform Name
            </label>
            <input
              type="text"
              defaultValue="mquora"
              className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Platform Description
            </label>
            <textarea
              defaultValue="Malayalam's first knowledge community platform"
              className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Max Upload Size (MB)
            </label>
            <input
              type="number"
              defaultValue="10"
              className="w-full px-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white font-semibold rounded-lg transition-all"
            >
              Save Settings
            </button>
            <button
              type="reset"
              className="px-6 py-2 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text)] font-semibold rounded-lg transition-all"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
