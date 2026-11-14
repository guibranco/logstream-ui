import { useCallback, useMemo, useRef, useState } from 'react';
import { LogEntry } from '../types';

/**
 * Which events are selected for copying. Selection is kept by event ID, so a
 * Shift+click range stays right while new events arrive, and only events still
 * on screen count: a reload or new filters drop the ones that went away.
 */
export function useLogSelection(logs: LogEntry[]) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const anchor = useRef<string | null>(null);

  const selectedLogs = useMemo(() => logs.filter(log => ids.has(log.id)), [logs, ids]);

  /** Toggle one event, or with `range` add every event between the last one clicked and this one. */
  const select = useCallback(
    (id: string, range = false) => {
      const order = logs.map(log => log.id);
      const from = anchor.current ? order.indexOf(anchor.current) : -1;
      const to = order.indexOf(id);
      setIds(prev => {
        const next = new Set(prev);
        if (range && from !== -1 && to !== -1) {
          for (const rangeId of order.slice(Math.min(from, to), Math.max(from, to) + 1)) next.add(rangeId);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      anchor.current = id;
    },
    [logs],
  );

  const selectAll = useCallback(() => setIds(new Set(logs.map(log => log.id))), [logs]);

  const clear = useCallback(() => {
    setIds(new Set());
    anchor.current = null;
  }, []);

  return {
    selectedIds: ids,
    selectedLogs,
    isSelecting: selectedLogs.length > 0,
    allSelected: logs.length > 0 && selectedLogs.length === logs.length,
    select,
    selectAll,
    clear,
  };
}
