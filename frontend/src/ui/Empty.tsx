export default function Empty({
  title,
  hint,
  icon,
  btn,
  onBtn
}: {
  title: string;
  hint: string;
  icon?: string;
  btn?: string;
  onBtn?: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      {icon && <p className="text-3xl leading-none">{icon}</p>}
      <p className={`text-sm font-medium text-slate-800 ${icon ? "mt-3" : ""}`}>{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{hint}</p>
      {btn && onBtn && (
        <button
          type="button"
          onClick={onBtn}
          className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {btn}
        </button>
      )}
    </div>
  );
}
