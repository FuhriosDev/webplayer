import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_DURATION_MS = 3000;

export function useTransientNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setNotice(message);
    timeoutRef.current = setTimeout(() => {
      setNotice(null);
      timeoutRef.current = null;
    }, NOTICE_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return { notice, showNotice };
}
