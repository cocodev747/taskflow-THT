import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

type Kind = "ok" | "err";

type ToastItem = {
  id: number;
  kind: Kind;
  msg: string;
};

const ToastCtx = createContext<{
  push: (msg: string, kind: Kind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((msg: string, kind: Kind) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, msg }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md px-4 py-3 text-sm text-white shadow-lg ${
              t.kind === "ok" ? "bg-slate-900" : "bg-red-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return {
    ok: (msg: string) => ctx.push(msg, "ok"),
    err: (msg: string) => ctx.push(msg, "err")
  };
}

export function SessionToast() {
  const toast = useToast();

  useEffect(() => {
    function onLogout() {
      toast.err("Session expired. Please sign in again.");
    }
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [toast]);

  return null;
}
