import { useState, useCallback } from 'react';

export interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  mutate: (args?: unknown) => Promise<T | null>;
  reset: () => void;
}

export function useSupabaseMutation<T, A = void>(
  mutationFn: (args: A) => Promise<T>
): Omit<MutationState<T>, 'mutate'> & { mutate: (args: A) => Promise<T | null> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (args: A): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, mutate, reset };
}
