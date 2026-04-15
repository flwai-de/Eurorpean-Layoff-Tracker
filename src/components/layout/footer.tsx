import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import NewsletterForm from "./newsletter-form";

export default function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  const sectionLabelStyle = { color: "var(--text-muted)" } as const;
  const linkStyle = { color: "var(--text-muted)" } as const;

  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: "var(--border-default)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <p
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              dimissio
            </p>
            <p
              className="mt-2 text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              {t("common.footerText")}
            </p>
          </div>

          {/* Links */}
          <div>
            <p
              className="text-[10px] font-medium uppercase tracking-[1.5px]"
              style={sectionLabelStyle}
            >
              Links
            </p>
            <ul className="mt-3 space-y-2 text-[11px]">
              <li>
                <Link
                  href="/datenschutz"
                  className="footer-link transition-colors"
                  style={linkStyle}
                >
                  {t("common.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/impressum"
                  className="footer-link transition-colors"
                  style={linkStyle}
                >
                  {t("common.imprint")}
                </Link>
              </li>
              <li>
                <Link
                  href="/api-docs"
                  className="footer-link transition-colors"
                  style={linkStyle}
                >
                  {t("common.apiDocs")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter mini signup */}
          <div id="newsletter">
            <p
              className="text-[10px] font-medium uppercase tracking-[1.5px]"
              style={sectionLabelStyle}
            >
              {t("newsletter.subscribe")}
            </p>
            <NewsletterForm />
            <p
              className="mt-2 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              {t("newsletter.gdprNotice")}
            </p>
          </div>
        </div>

        <div
          className="mt-10 border-t pt-6 text-center text-[10px]"
          style={{
            borderColor: "var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          &copy; {year} Dimissio
        </div>
      </div>
    </footer>
  );
}
