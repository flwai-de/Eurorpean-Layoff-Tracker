import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "de"
        ? "Datenschutzerklärung | Dimissio"
        : "Privacy Policy | Dimissio",
    robots: { index: false, follow: false },
  };
}

export default async function DatenschutzPage({ params }: Props) {
  const { locale } = await params;
  return locale === "de" ? <DatenschutzDe /> : <DatenschutzEn />;
}

const containerClass =
  "mx-auto max-w-3xl px-6 py-12 text-neutral-700 dark:text-neutral-300";
const h1Class = "text-3xl font-bold text-neutral-900 dark:text-white";
const h2Class =
  "mt-8 text-lg font-semibold text-neutral-900 dark:text-white";
const pClass = "mt-3 text-sm leading-relaxed whitespace-pre-line";
const ulClass = "mt-3 ml-5 list-disc space-y-1 text-sm leading-relaxed";
const linkClass =
  "text-teal-700 transition hover:underline dark:text-teal-400";

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
}

function MailLink({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className={linkClass}>
      {address}
    </a>
  );
}

function DatenschutzDe() {
  return (
    <div className={containerClass}>
      <h1 className={h1Class}>Datenschutzerklärung</h1>

      <h2 className={h2Class}>1. Verantwortlicher</h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6, 70794 Filderstadt\n"}
        E-Mail: <MailLink address="kontakt@dimissio.eu" />
        {"\nTelefon: "}
        <a href="tel:+4920229540186" className={linkClass}>
          0202 29540186
        </a>
      </p>

      <h2 className={h2Class}>2. Allgemeines zur Datenverarbeitung</h2>
      <p className={pClass}>
        Diese Website verarbeitet personenbezogene Daten nur im technisch
        notwendigen Umfang. Eine Weitergabe an Dritte erfolgt nur, soweit in
        dieser Datenschutzerklärung beschrieben. Die Rechtsgrundlagen ergeben
        sich aus der Datenschutz-Grundverordnung (DSGVO).
      </p>
      <p className={pClass}>
        Zur strukturierten Aufbereitung von öffentlich zugänglichen Informationen
        nutzen wir automatisierte Backend-Dienste (KI-Schnittstellen). Hierbei
        werden keine personenbezogenen Daten unserer Website-Besucher
        verarbeitet.
      </p>

      <h2 className={h2Class}>3. Hosting</h2>
      <p className={pClass}>
        Diese Website wird auf Servern der Hetzner Online GmbH, Industriestr.
        25, 91710 Gunzenhausen, Deutschland gehostet. Bei jedem Zugriff werden
        automatisch Server-Logfiles erfasst, die Ihre IP-Adresse, Browsertyp,
        Betriebssystem, die aufgerufene Seite, Datum und Uhrzeit des Zugriffs
        enthalten. Diese Daten werden zur Gewährleistung des sicheren Betriebs
        verarbeitet und nach 14 Tagen gelöscht.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an der sicheren Bereitstellung der Website).
        {"\n"}Da der Server in Deutschland steht, findet kein Drittlandtransfer
        statt.
      </p>

      <h2 className={h2Class}>4. Content Delivery Network (Cloudflare)</h2>
      <p className={pClass}>
        Wir nutzen Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107,
        USA als DNS- und CDN-Dienst. Bei jedem Seitenaufruf wird Ihre IP-Adresse
        an Cloudflare übermittelt, um die Anfrage zu routen und die Website vor
        Angriffen zu schützen. Cloudflare kann technisch notwendige Cookies (z. B.
        den Cookie __cf_bm zur Bot-Erkennung) setzen, um die Sicherheit und
        Stabilität der Seite zu gewährleisten. Dies ist für den Betrieb der
        Website zwingend erforderlich.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an der sicheren und performanten Bereitstellung der Website).
        {"\n"}Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert.
        Weitere Informationen:{" "}
        <ExtLink href="https://www.cloudflare.com/privacypolicy/">
          https://www.cloudflare.com/privacypolicy/
        </ExtLink>
      </p>

      <h2 className={h2Class}>5. Newsletter</h2>
      <p className={pClass}>
        Wenn Sie sich für unseren Newsletter anmelden, verarbeiten wir Ihre
        E-Mail-Adresse und Ihre Sprachpräferenz (Deutsch oder Englisch). Die
        Anmeldung erfolgt über ein Double-Opt-In-Verfahren: Nach Eingabe Ihrer
        E-Mail-Adresse erhalten Sie eine Bestätigungsmail. Erst nach Klick auf
        den Bestätigungslink wird Ihr Abonnement aktiviert.
        {"\n"}Der Versand erfolgt über Resend, Inc., 548 Market St, San
        Francisco, CA 94104, USA. Dabei wird Ihre E-Mail-Adresse an Resend
        übermittelt.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Sie
        können Ihre Einwilligung jederzeit widerrufen, indem Sie den Abmeldelink
        in jeder Newsletter-Ausgabe nutzen.
        {"\n"}Resend verarbeitet Daten gemäß den EU-Standardvertragsklauseln.
        Weitere Informationen:{" "}
        <ExtLink href="https://resend.com/legal/privacy-policy">
          https://resend.com/legal/privacy-policy
        </ExtLink>
      </p>

      <h2 className={h2Class}>6. Externe Inhalte (Firmenlogos)</h2>
      <p className={pClass}>
        Auf unseren Seiten werden Firmenlogos über den Dienst Logo.dev geladen.
        Anbieter ist die Zilite Inc. (Logo.dev), USA. Beim Laden dieser Bilder
        wird Ihre IP-Adresse an einen Server in den USA übertragen.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an der professionellen Darstellung von Firmeninformationen). Wir stellen
        durch Standardvertragsklauseln ein angemessenes Datenschutzniveau
        sicher.
      </p>

      <h2 className={h2Class}>7. Community-Tipps (Submission-Formular)</h2>
      <p className={pClass}>
        Über das Submission-Formular können Sie uns Hinweise zu Entlassungen
        übermitteln. Dabei verarbeiten wir die von Ihnen eingegebenen Daten
        (Firmenname, Details, optional: Quell-URL und E-Mail-Adresse). Es werden
        keine IP-Adressen gespeichert.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch
        Absenden des Formulars mit DSGVO-Checkbox).
      </p>

      <h2 className={h2Class}>8. Cookies und Analyse</h2>
      <p className={pClass}>
        Diese Website verwendet keine Tracking-Cookies und kein nutzerbasiertes
        Tracking zu Marketingzwecken. Wir setzen ausschließlich technisch
        notwendige Cookies ein (siehe Punkt 4), die für die Sicherheit der
        Infrastruktur erforderlich sind.
        {"\n"}Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG (unbedingte
        Erforderlichkeit zur Bereitstellung des Dienstes).
      </p>

      <h2 className={h2Class}>9. Webanalyse (Umami)</h2>
      <p className={pClass}>
        Wir nutzen zur statistischen Auswertung der Besucherzugriffe das
        Analyse-Tool Umami. Die Software wird von uns selbst gehostet
        (Serverstandort Deutschland, Hetzner). Die Analyse erfolgt vollständig
        anonymisiert und ohne den Einsatz von Cookies. Es werden keine
        IP-Adressen dauerhaft gespeichert und kein Drittlandtransfer
        durchgeführt.
        {"\n"}Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an der Reichweitenmessung ohne Identifizierbarkeit).
      </p>

      <h2 className={h2Class}>10. SSL-Verschlüsselung</h2>
      <p className={pClass}>
        Diese Website nutzt aus Sicherheitsgründen eine SSL- bzw.
        TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie an dem
        Schloss-Symbol in Ihrer Browserzeile und daran, dass die Adresszeile von
        „http://&quot; auf „https://&quot; wechselt.
      </p>

      <h2 className={h2Class}>11. Ihre Rechte</h2>
      <p className={pClass}>
        Sie haben gegenüber dem Verantwortlichen folgende Rechte bezüglich Ihrer
        personenbezogenen Daten:
      </p>
      <ul className={ulClass}>
        <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
        <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
        <li>Recht auf Löschung (Art. 17 DSGVO)</li>
        <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
      </ul>
      <p className={pClass}>
        Zur Ausübung Ihrer Rechte wenden Sie sich an:{" "}
        <MailLink address="kontakt@dimissio.eu" />
      </p>

      <h2 className={h2Class}>12. Beschwerderecht bei einer Aufsichtsbehörde</h2>
      <p className={pClass}>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
        Verarbeitung Ihrer personenbezogenen Daten zu beschweren. Die für uns
        zuständige Aufsichtsbehörde ist:
        {"\n"}Der Landesbeauftragte für den Datenschutz und die
        Informationsfreiheit Baden-Württemberg
        {"\n"}
        <ExtLink href="https://www.baden-wuerttemberg.datenschutz.de">
          https://www.baden-wuerttemberg.datenschutz.de
        </ExtLink>
      </p>

      <h2 className={h2Class}>13. Änderung dieser Datenschutzerklärung</h2>
      <p className={pClass}>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie
        stets den aktuellen rechtlichen Anforderungen entspricht. Stand: April
        2026.
      </p>
    </div>
  );
}

function DatenschutzEn() {
  return (
    <div className={containerClass}>
      <h1 className={h1Class}>Privacy Policy</h1>

      <h2 className={h2Class}>1. Data Controller</h2>
      <p className={pClass}>
        {"Emir-Alan Gencaslan\nIm Alten Rad 6, 70794 Filderstadt, Germany\n"}
        Email: <MailLink address="kontakt@dimissio.eu" />
        {"\nPhone: "}
        <a href="tel:+4920229540186" className={linkClass}>
          +49 202 29540186
        </a>
      </p>

      <h2 className={h2Class}>2. General Information</h2>
      <p className={pClass}>
        This website processes personal data only to the extent technically
        necessary. Data is only shared with third parties as described in this
        privacy policy. The legal bases arise from the General Data Protection
        Regulation (GDPR).
      </p>
      <p className={pClass}>
        To process publicly available information, we use automated backend
        services (AI interfaces). No personal data of our website visitors is
        processed in this context.
      </p>

      <h2 className={h2Class}>3. Hosting</h2>
      <p className={pClass}>
        This website is hosted on servers operated by Hetzner Online GmbH,
        Industriestr. 25, 91710 Gunzenhausen, Germany. Each time you access this
        website, server log files are automatically collected, including your IP
        address, browser type, operating system, the page accessed, and the
        date and time of access. This data is processed to ensure secure
        operation and is deleted after 14 days.
        {"\n"}Legal basis: Art. 6(1)(f) GDPR (legitimate interest in the secure
        provision of the website).
        {"\n"}The server is located in Germany. No transfer to third countries
        takes place.
      </p>

      <h2 className={h2Class}>4. Content Delivery Network (Cloudflare)</h2>
      <p className={pClass}>
        We use Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA as
        a DNS and CDN provider. Each time you access a page, your IP address is
        transmitted to Cloudflare to route the request and protect the website
        from attacks. Cloudflare may set technically necessary cookies (e.g. the
        __cf_bm cookie for bot detection) to ensure the security and stability
        of the website. This is strictly required for the operation of the
        website.
        {"\n"}Legal basis: Art. 6(1)(f) GDPR (legitimate interest in the secure
        and performant provision of the website).
        {"\n"}Cloudflare is certified under the EU-US Data Privacy Framework.
        More information:{" "}
        <ExtLink href="https://www.cloudflare.com/privacypolicy/">
          https://www.cloudflare.com/privacypolicy/
        </ExtLink>
      </p>

      <h2 className={h2Class}>5. Newsletter</h2>
      <p className={pClass}>
        When you subscribe to our newsletter, we process your email address and
        language preference (German or English). Registration uses a double
        opt-in procedure: after entering your email address, you will receive a
        confirmation email. Your subscription is only activated after you click
        the confirmation link.
        {"\n"}Emails are sent via Resend, Inc., 548 Market St, San Francisco, CA
        94104, USA. Your email address is transmitted to Resend for this
        purpose.
        {"\n"}Legal basis: Art. 6(1)(a) GDPR (consent). You may withdraw your
        consent at any time by using the unsubscribe link included in every
        newsletter.
        {"\n"}Resend processes data in accordance with EU Standard Contractual
        Clauses. More information:{" "}
        <ExtLink href="https://resend.com/legal/privacy-policy">
          https://resend.com/legal/privacy-policy
        </ExtLink>
      </p>

      <h2 className={h2Class}>6. External Content (Company Logos)</h2>
      <p className={pClass}>
        Our pages display company logos loaded via the Logo.dev service. The
        provider is Zilite Inc. (Logo.dev), USA. When these images are loaded,
        your IP address is transmitted to a server in the USA.
        {"\n"}Legal basis: Art. 6(1)(f) GDPR (legitimate interest in the
        professional presentation of company information). We ensure an
        adequate level of data protection through Standard Contractual Clauses.
      </p>

      <h2 className={h2Class}>7. Community Tips (Submission Form)</h2>
      <p className={pClass}>
        You can submit tips about layoffs through our submission form. We
        process the data you enter (company name, details, optionally: source
        URL and email address). No IP addresses are stored.
        {"\n"}Legal basis: Art. 6(1)(a) GDPR (consent through submission of the
        form with GDPR checkbox).
      </p>

      <h2 className={h2Class}>8. Cookies and Analytics</h2>
      <p className={pClass}>
        This website does not use tracking cookies or user-based tracking for
        marketing purposes. We only use technically necessary cookies (see
        Section 4), which are required for the security of the infrastructure.
        {"\n"}Legal basis: § 25(2)(2) TDDDG (strict necessity for the provision
        of the service).
      </p>

      <h2 className={h2Class}>9. Web Analytics (Umami)</h2>
      <p className={pClass}>
        We use the analytics tool Umami for statistical evaluation of visitor
        access. The software is self-hosted by us (server location: Germany,
        Hetzner). The analysis is carried out in a fully anonymised manner and
        without the use of cookies. No IP addresses are permanently stored and
        no transfer to third countries takes place.
        {"\n"}Legal basis: Art. 6(1)(f) GDPR (legitimate interest in audience
        measurement without identifiability).
      </p>

      <h2 className={h2Class}>10. SSL Encryption</h2>
      <p className={pClass}>
        For security reasons, this website uses SSL/TLS encryption. You can
        recognise an encrypted connection by the lock icon in your browser bar
        and the address bar changing from &quot;http://&quot; to &quot;https://&quot;.
      </p>

      <h2 className={h2Class}>11. Your Rights</h2>
      <p className={pClass}>
        You have the following rights regarding your personal data:
      </p>
      <ul className={ulClass}>
        <li>Right of access (Art. 15 GDPR)</li>
        <li>Right to rectification (Art. 16 GDPR)</li>
        <li>Right to erasure (Art. 17 GDPR)</li>
        <li>Right to restriction of processing (Art. 18 GDPR)</li>
        <li>Right to data portability (Art. 20 GDPR)</li>
        <li>Right to object (Art. 21 GDPR)</li>
      </ul>
      <p className={pClass}>
        To exercise your rights, contact:{" "}
        <MailLink address="kontakt@dimissio.eu" />
      </p>

      <h2 className={h2Class}>12. Right to Lodge a Complaint</h2>
      <p className={pClass}>
        You have the right to lodge a complaint with a data protection
        supervisory authority regarding the processing of your personal data.
        The competent authority for us is:
        {"\n"}Der Landesbeauftragte für den Datenschutz und die
        Informationsfreiheit Baden-Württemberg
        {"\n"}
        <ExtLink href="https://www.baden-wuerttemberg.datenschutz.de">
          https://www.baden-wuerttemberg.datenschutz.de
        </ExtLink>
      </p>

      <h2 className={h2Class}>13. Changes to This Privacy Policy</h2>
      <p className={pClass}>
        We reserve the right to update this privacy policy to ensure it always
        complies with current legal requirements. Last updated: April 2026.
      </p>
    </div>
  );
}
