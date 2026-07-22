import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
const SSE_URL =
  (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '') + '/events';

/**
 * 連接 SSE 串流（GET /api/events），收到事件後 invalidate react-query cache。
 * 放喺 App 最頂層 mount 一次即可。
 */
export function useSseListener() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.addEventListener('lead_update', () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    });

    es.addEventListener('email_update', () => {
      qc.invalidateQueries({ queryKey: ['emailQueue'] });
    });

    es.addEventListener('notification', (e) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      try {
        const data = JSON.parse(e.data);
        if (data?.title) console.info('[notification]', data.title);
      } catch { /* ignore */ }
    });

    es.addEventListener('task_update', () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    });

    es.onerror = () => {
      // EventSource 會自動重連，唔使手動處理
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [qc]);
}
