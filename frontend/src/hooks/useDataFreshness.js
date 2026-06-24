import { useState, useEffect } from 'react';

const STALE_DAYS = 7;

export function useDataFreshness(jsonPath) {
  const [date, setDate] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jsonPath) { setLoading(false); return; }
    setLoading(true);
    fetch(jsonPath)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const ts = data?.generated_at;
        if (ts) {
          const d = new Date(ts);
          setDate(d);
          setIsStale((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) > STALE_DAYS);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jsonPath]);

  return { date, isStale, loading };
}

export default useDataFreshness;
