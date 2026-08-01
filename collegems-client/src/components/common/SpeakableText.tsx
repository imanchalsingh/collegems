import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAccessibility } from "../../context/AccessibilityContext";

interface SpeakableTextProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  as?: "p" | "div" | "span" | "h1" | "h2" | "h3";
}

/**
 * Renders content with an optional text-to-speech control.
 * Useful for announcements, exam questions, and dashboard summaries.
 */
export default function SpeakableText({
  text,
  children,
  className = "",
  as: Tag = "div",
}: SpeakableTextProps) {
  const { t } = useTranslation();
  const { speak, voiceEnabled } = useAccessibility();

  return (
    <Tag className={`group relative ${className}`}>
      {children ?? text}
      {voiceEnabled && (
        <button
          type="button"
          onClick={() => speak(text)}
          className="ml-2 inline-flex align-middle rounded-md p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label={t("dashboard.readAloud")}
        >
          <Volume2 size={14} aria-hidden="true" />
        </button>
      )}
    </Tag>
  );
}
