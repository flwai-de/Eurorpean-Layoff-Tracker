import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-neutral-400">
        <p>{t("copyright")}</p>
        <div className="flex gap-6">
          <a href="#" className="transition hover:text-white">
            {t("imprint")}
          </a>
          <a href="#" className="transition hover:text-white">
            {t("privacy")}
          </a>
        </div>
      </div>
    </footer>
  );
}
