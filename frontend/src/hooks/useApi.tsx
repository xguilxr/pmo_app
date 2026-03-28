import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
      <p className="text-red-600 dark:text-red-400 text-[13px] font-medium mb-2">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[13px] text-accent hover:opacity-80 font-semibold">
          Reintentar
        </button>
      )}
    </div>
  );
}
