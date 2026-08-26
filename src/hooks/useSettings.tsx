import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const KEY = "leanerp-quiz-settings";

interface Settings {
  soundEnabled: boolean;
  presentationBroadcastEnabled: boolean;
}

const defaults: Settings = { soundEnabled: true, presentationBroadcastEnabled: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function save(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

interface Ctx {
  settings: Settings;
  setSoundEnabled: (v: boolean) => void;
  setPresentationBroadcastEnabled: (v: boolean) => void;
}

const SettingsContext = createContext<Ctx>({
  settings: defaults,
  setSoundEnabled: () => {},
  setPresentationBroadcastEnabled: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, soundEnabled: v };
      save(next);
      return next;
    });
  }, []);

  const setPresentationBroadcastEnabled = useCallback((v: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, presentationBroadcastEnabled: v };
      save(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSoundEnabled, setPresentationBroadcastEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
