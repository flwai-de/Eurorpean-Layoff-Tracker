import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "de" ? "Impressum | Dimissio" : "Legal Notice | Dimissio",
    robots: { index: false, follow: false },
  };
}

export default async function ImpressumPage({ params }: Props) {
  const { locale } = await params;
  return locale === "de" ? <ImpressumDe /> : <ImpressumEn />;
}

const containerClass =
  "mx-auto max-w-3xl px-6 py-12 text-neutral-700 dark:text-neutral-300";
const h1Class = "text-3xl font-bold text-neutral-900 dark:text-white";
const h2Class =
  "mt-8 text-lg font-semibold text-neutral-900 dark:text-white";
const pClass = "mt-3 text-sm leading-relaxed whitespace-pre-line";
const linkClass =
  "text-teal-700 transition hover:underline dark:text-teal-400";

function ImpressumDe() {
  return (
    <div className={containerClass}>
      <h1 className={h1Class}>Impressum</h1>

      <h2 className={h2Class}>Angaben gemäß § 5 TMG</h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6\n70794 Filderstadt"}
      </p>

      <h2 className={h2Class}>Kontakt</h2>
      <p className={pClass}>
        Telefon:{" "}
        <a href="tel:+4920229540186" className={linkClass}>
          0202 29540186
        </a>
        {"\n"}E-Mail:{" "}
        <a href="mailto:kontakt@dimissio.eu" className={linkClass}>
          kontakt@dimissio.eu
        </a>
      </p>

      <h2 className={h2Class}>Umsatzsteuer-ID</h2>
      <p className={pClass}>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
        DE459690110
      </p>

      <h2 className={h2Class}>Redaktionell verantwortlich</h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6\n70794 Filderstadt"}
      </p>

      <h2 className={h2Class}>Verbraucherstreitbeilegung</h2>
      <p className={pClass}>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2 className={h2Class}>
        Zentrale Kontaktstelle nach dem Digital Services Act – DSA (Verordnung
        (EU) 2022/2065)
      </h2>
      <p className={pClass}>
        Unsere zentrale Kontaktstelle für Nutzer und Behörden nach Art. 11, 12
        DSA erreichen Sie wie folgt:
        {"\n"}E-Mail:{" "}
        <a href="mailto:kontakt@dimissio.eu" className={linkClass}>
          kontakt@dimissio.eu
        </a>
        {"\n"}Telefon:{" "}
        <a href="tel:+4920229540186" className={linkClass}>
          0202 29540186
        </a>
        {"\n"}Die für den Kontakt zur Verfügung stehenden Sprachen sind: Deutsch,
        Englisch.
      </p>
    </div>
  );
}

function ImpressumEn() {
  return (
    <div className={containerClass}>
      <h1 className={h1Class}>Legal Notice</h1>

      <h2 className={h2Class}>
        Information pursuant to § 5 TMG (German Telemedia Act)
      </h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6\n70794 Filderstadt, Germany"}
      </p>

      <h2 className={h2Class}>Contact</h2>
      <p className={pClass}>
        Phone:{" "}
        <a href="tel:+4920229540186" className={linkClass}>
          +49 202 29540186
        </a>
        {"\n"}Email:{" "}
        <a href="mailto:kontakt@dimissio.eu" className={linkClass}>
          kontakt@dimissio.eu
        </a>
      </p>

      <h2 className={h2Class}>VAT ID</h2>
      <p className={pClass}>
        VAT identification number pursuant to § 27 a of the German VAT Act:
        DE459690110
      </p>

      <h2 className={h2Class}>Editorially responsible</h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6\n70794 Filderstadt, Germany"}
      </p>

      <h2 className={h2Class}>Consumer dispute resolution</h2>
      <p className={pClass}>
        We are not willing or obliged to participate in dispute resolution
        proceedings before a consumer arbitration board.
      </p>

      <h2 className={h2Class}>
        Central contact point under the Digital Services Act – DSA (Regulation
        (EU) 2022/2065)
      </h2>
      <p className={pClass}>
        Our central contact point for users and authorities pursuant to Art. 11,
        12 DSA can be reached as follows:
        {"\n"}Email:{" "}
        <a href="mailto:kontakt@dimissio.eu" className={linkClass}>
          kontakt@dimissio.eu
        </a>
        {"\n"}Phone:{" "}
        <a href="tel:+4920229540186" className={linkClass}>
          +49 202 29540186
        </a>
        {"\n"}Available languages: German, English.
      </p>
    </div>
  );
}
