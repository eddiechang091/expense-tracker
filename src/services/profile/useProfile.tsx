import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadProfile,
  saveProfile,
  DEFAULT_PROFILE,
  type UserProfile,
} from "@/services/profile/profile";

interface ProfileContextValue {
  profile: UserProfile;
  loaded: boolean;
  update: (patch: Partial<UserProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      // Persist async; the UI updates immediately from state.
      saveProfile(next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ profile, loaded, update }),
    [profile, loaded, update]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/** Shared profile state — every consumer sees updates immediately. */
export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
