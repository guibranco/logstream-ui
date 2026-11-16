import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs` (default 60 s) — for relative times without refetching. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
