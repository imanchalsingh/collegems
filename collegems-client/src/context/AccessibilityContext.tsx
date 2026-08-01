import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "../i18n/config";

const STORAGE_KEY = "scms_a11y_prefs";

type A11yPrefs = {
  highContrast: boolean;
  dyslexicFont: boolean;
  fontScale: number;
  voiceEnabled: boolean;
  voiceRate: number;
};

type AccessibilityContextValue = A11yPrefs & {
  setHighContrast: (value: boolean) => void;
  setDyslexicFont: (value: boolean) => void;
  setFontScale: (value: number) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  resetFont: () => void;
  setVoiceEnabled: (value: boolean) => void;
  setVoiceRate: (value: number) => void;
  speak: (text: string) => void;
  speakSelection: () => void;
  speakPageSummary: () => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  language: AppLanguage;
  setLanguage: (code: AppLanguage) => void;
};

const DEFAULT_PREFS: A11yPrefs = {
  highContrast: false,
  dyslexicFont: false,
  fontScale: 100,
  voiceEnabled: true,
  voiceRate: 1,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

const loadPrefs = (): A11yPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const [prefs, setPrefs] = useState<A11yPrefs>(() => loadPrefs());
  const [isSpeaking, setIsSpeaking] = useState(false);

  const persist = useCallback((next: A11yPrefs) => {
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-high-contrast", prefs.highContrast);
    root.classList.toggle("a11y-dyslexic", prefs.dyslexicFont);
    root.style.setProperty("--a11y-font-scale", `${prefs.fontScale / 100}`);
  }, [prefs.highContrast, prefs.dyslexicFont, prefs.fontScale]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!prefs.voiceEnabled || !text.trim()) return;
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      const match = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);
      utterance.lang = match?.speechLang || "en-US";
      utterance.rate = prefs.voiceRate;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [i18n.language, prefs.voiceEnabled, prefs.voiceRate]
  );

  const speakSelection = useCallback(() => {
    const selection = window.getSelection()?.toString() || "";
    if (selection.trim()) {
      speak(selection);
      return;
    }
    const main = document.getElementById("main-content");
    speak(main?.innerText?.slice(0, 1200) || document.body.innerText.slice(0, 800));
  }, [speak]);

  const speakPageSummary = useCallback(() => {
    const title = document.title;
    const heading =
      document.querySelector("h1")?.textContent ||
      document.querySelector("h2")?.textContent ||
      "";
    speak(`${title}. ${heading}. ${t("app.tagline")}`);
  }, [speak, t]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...prefs,
      setHighContrast: (highContrast) => persist({ ...prefs, highContrast }),
      setDyslexicFont: (dyslexicFont) => persist({ ...prefs, dyslexicFont }),
      setFontScale: (fontScale) =>
        persist({
          ...prefs,
          fontScale: Math.min(160, Math.max(85, fontScale)),
        }),
      increaseFont: () =>
        persist({
          ...prefs,
          fontScale: Math.min(160, prefs.fontScale + 10),
        }),
      decreaseFont: () =>
        persist({
          ...prefs,
          fontScale: Math.max(85, prefs.fontScale - 10),
        }),
      resetFont: () => persist({ ...prefs, fontScale: 100 }),
      setVoiceEnabled: (voiceEnabled) => persist({ ...prefs, voiceEnabled }),
      setVoiceRate: (voiceRate) =>
        persist({
          ...prefs,
          voiceRate: Math.min(1.6, Math.max(0.7, voiceRate)),
        }),
      speak,
      speakSelection,
      speakPageSummary,
      stopSpeaking,
      isSpeaking,
      language: (i18n.language as AppLanguage) || "en",
      setLanguage: (code) => {
        void i18n.changeLanguage(code);
      },
    }),
    [
      prefs,
      persist,
      speak,
      speakSelection,
      speakPageSummary,
      stopSpeaking,
      isSpeaking,
      i18n,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return ctx;
}
