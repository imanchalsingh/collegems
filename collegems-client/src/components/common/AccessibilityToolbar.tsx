import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Accessibility,
  ALargeSmall,
  Contrast,
  Languages,
  Minus,
  Plus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../../i18n/config";
import { useAccessibility } from "../../context/AccessibilityContext";

export default function AccessibilityToolbar() {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    highContrast,
    setHighContrast,
    dyslexicFont,
    setDyslexicFont,
    fontScale,
    increaseFont,
    decreaseFont,
    resetFont,
    voiceEnabled,
    setVoiceEnabled,
    voiceRate,
    setVoiceRate,
    speakSelection,
    speakPageSummary,
    stopSpeaking,
    isSpeaking,
    language,
    setLanguage,
  } = useAccessibility();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>(
      "button, select, input"
    );
    first?.focus();
  }, [open]);

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={t("a11y.toolbar")}
          className="w-[min(92vw,22rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Accessibility size={16} aria-hidden="true" />
              {t("a11y.toolbar")}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t("a11y.closeToolbar")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <label className="block text-sm">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-1">
              <Languages size={14} aria-hidden="true" />
              {t("a11y.language")}
            </span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              aria-label={t("a11y.language")}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <ToggleRow
              label={t("a11y.highContrast")}
              checked={highContrast}
              onChange={setHighContrast}
              icon={<Contrast size={14} aria-hidden="true" />}
              onLabel={t("a11y.enabled")}
              offLabel={t("a11y.disabled")}
            />
            <ToggleRow
              label={t("a11y.dyslexicFont")}
              checked={dyslexicFont}
              onChange={setDyslexicFont}
              icon={<ALargeSmall size={14} aria-hidden="true" />}
              onLabel={t("a11y.enabled")}
              offLabel={t("a11y.disabled")}
            />
            <ToggleRow
              label={t("a11y.voiceAssist")}
              checked={voiceEnabled}
              onChange={setVoiceEnabled}
              icon={
                voiceEnabled ? (
                  <Volume2 size={14} aria-hidden="true" />
                ) : (
                  <VolumeX size={14} aria-hidden="true" />
                )
              }
              onLabel={t("a11y.enabled")}
              offLabel={t("a11y.disabled")}
            />
          </div>

          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              {t("a11y.fontSize")}: {fontScale}%
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={decreaseFont}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-sm"
                aria-label={t("a11y.decreaseFont")}
              >
                <Minus size={14} aria-hidden="true" /> A
              </button>
              <button
                type="button"
                onClick={resetFont}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-sm"
                aria-label={t("a11y.resetFont")}
              >
                100%
              </button>
              <button
                type="button"
                onClick={increaseFont}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-sm"
                aria-label={t("a11y.increaseFont")}
              >
                <Plus size={14} aria-hidden="true" /> A
              </button>
            </div>
          </div>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300 mb-1 block">
              {t("a11y.voiceRate")}: {voiceRate.toFixed(1)}x
            </span>
            <input
              type="range"
              min={0.7}
              max={1.6}
              step={0.1}
              value={voiceRate}
              onChange={(e) => setVoiceRate(Number(e.target.value))}
              className="w-full"
              aria-label={t("a11y.voiceRate")}
            />
          </label>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={speakSelection}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-sm"
            >
              {t("a11y.speakSelection")}
            </button>
            <button
              type="button"
              onClick={speakPageSummary}
              className="rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-sm"
            >
              {t("a11y.speakPage")}
            </button>
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className="rounded-xl border border-slate-300 dark:border-slate-700 py-2 text-sm disabled:opacity-50"
            >
              {t("a11y.stopSpeaking")}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg inline-flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        aria-label={open ? t("a11y.closeToolbar") : t("a11y.openToolbar")}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Accessibility size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  icon,
  onLabel,
  offLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
      <span className="text-sm text-slate-700 dark:text-slate-200 inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span className="sr-only">{checked ? onLabel : offLabel}</span>
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
