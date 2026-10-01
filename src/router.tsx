import { useCallback, useEffect, useState } from "react";

export function normalizeHash(hash: string): string {
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "/") return "/dashboard";
  return raw.charAt(0) === "/" ? raw : "/" + raw;
}

export function useRoute(): [string, (path: string) => void] {
  const [route, setRoute] = useState<string>(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(normalizeHash(window.location.hash));
      window.scrollTo({ top: 0, left: 0 });
      const main = document.getElementById("main-content");
      if (main) main.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    const withoutHash = path.charAt(0) === "#" ? path.slice(1) : path;
    const target = normalizeHash(withoutHash);
    if (normalizeHash(window.location.hash) === target) {
      setRoute(target);
      return;
    }
    window.location.hash = target;
  }, []);

  return [route, navigate];
}
