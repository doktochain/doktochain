import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSupabaseQuery } from '../useSupabaseQuery';
import { useSupabaseMutation } from '../useSupabaseMutation';

describe('useSupabaseQuery', () => {
  it('starts in loading state when queryFn is provided', () => {
    const queryFn = vi.fn().mockResolvedValue(['result']);
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves with data on success', async () => {
    const queryFn = vi.fn().mockResolvedValue(['item1', 'item2']);
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(['item1', 'item2']);
    expect(result.current.error).toBeNull();
  });

  it('sets error message on failure', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('handles non-Error rejection', async () => {
    const queryFn = vi.fn().mockRejectedValue('string error');
    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('An error occurred');
  });

  it('does not start loading when queryFn is null', () => {
    const { result } = renderHook(() => useSupabaseQuery(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('refetch re-executes the query', async () => {
    let callCount = 0;
    const queryFn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`result-${callCount}`);
    });

    const { result } = renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toBe('result-1');

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('result-2');
    });
  });

  it('re-executes when deps change', async () => {
    const queryFn1 = vi.fn().mockResolvedValue('first');
    const queryFn2 = vi.fn().mockResolvedValue('second');

    const { result, rerender } = renderHook(
      ({ fn, dep }) => useSupabaseQuery(fn, [dep]),
      { initialProps: { fn: queryFn1, dep: 'a' } }
    );

    await waitFor(() => {
      expect(result.current.data).toBe('first');
    });

    rerender({ fn: queryFn2, dep: 'b' });

    await waitFor(() => {
      expect(result.current.data).toBe('second');
    });
  });
});

describe('useSupabaseMutation', () => {
  it('starts in idle state', () => {
    const mutationFn = vi.fn();
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves with data on successful mutate', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1', name: 'Created' });
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    let mutateResult: any;
    await act(async () => {
      mutateResult = await result.current.mutate({ name: 'test' } as any);
    });

    expect(mutateResult).toEqual({ id: '1', name: 'Created' });
    expect(result.current.data).toEqual({ id: '1', name: 'Created' });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failure and returns null', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Mutation failed'));
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    let mutateResult: any;
    await act(async () => {
      mutateResult = await result.current.mutate(undefined as any);
    });

    expect(mutateResult).toBeNull();
    expect(result.current.error).toBe('Mutation failed');
    expect(result.current.loading).toBe(false);
  });

  it('handles non-Error rejection with default message', async () => {
    const mutationFn = vi.fn().mockRejectedValue('unknown');
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    await act(async () => {
      await result.current.mutate(undefined as any);
    });

    expect(result.current.error).toBe('Operation failed');
  });

  it('sets loading during mutation', async () => {
    let resolver: (v: any) => void;
    const mutationFn = vi.fn().mockImplementation(() => new Promise(r => { resolver = r; }));
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    act(() => {
      result.current.mutate(undefined as any);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolver!({ id: '1' });
    });

    expect(result.current.loading).toBe(false);
  });

  it('reset clears all state', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: '1' });
    const { result } = renderHook(() => useSupabaseMutation(mutationFn));

    await act(async () => {
      await result.current.mutate(undefined as any);
    });

    expect(result.current.data).toEqual({ id: '1' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
