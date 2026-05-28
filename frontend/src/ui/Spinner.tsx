export default function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600" role="status">
      <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
