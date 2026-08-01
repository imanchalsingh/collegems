import { useTranslation } from "react-i18next";

/** WCAG skip link — first focusable control on every page. */
export default function SkipToContent() {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
