import type { Metadata } from "next";
import LegalPageLayout from "@/app/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Webplayer",
  description: "Datenschutzhinweise für Webplayer.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Datenschutzerklärung">
      <section>
        <h2>1. Verantwortlicher und Kontakt</h2>
        <p>
          Verantwortlich für die Verarbeitung personenbezogener Daten ist:
        </p>
        <address className="mt-3 not-italic">
          Marvin Fuhr
          <br />
          Ringstr. 4a, 85604 Zorneding, DE
          <br />
          E-Mail: online@marvin-fuhr.de
        </address>
      </section>

      <section>
        <h2>2. Welche Daten die Anwendung verarbeitet</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6">
          <li>
            <strong>Konto und Anmeldung:</strong> E-Mail-Adresse,
            eingegebenes Passwort, Supabase-Benutzer-ID und die für eine
            angemeldete Sitzung erforderlichen Authentifizierungsdaten. Das
            Passwort wird zur Anmeldung an Supabase Auth übermittelt und vom
            Anwendungscode nicht in den Inhalts- oder Playlisttabellen
            gespeichert. Anmeldung und Registrierung werden über Supabase
            Auth abgewickelt.
          </li>
          <li>
            <strong>Audiodateien:</strong> hochgeladene Audiodatei,
            Anzeigename, Speicherpfad, Benutzer-ID und ein zufällig erzeugtes
            Freigabetoken.
          </li>
          <li>
            <strong>Playlists und gespeicherte Inhalte:</strong> Playlistname,
            Playlist-ID, Besitzer-ID, Freigabetoken, Reihenfolge der Songs
            sowie Verweise auf gespeicherte Songs und Playlists.
          </li>
          <li>
            <strong>Technische Daten:</strong> Die Anwendung kann Fehler in
            Browser- und Serverkonsolen protokollieren. Vercel und Supabase
            können im Rahmen ihrer Dienste zusätzliche Verbindungs-,
            Sicherheits- oder Funktionsprotokolle verarbeiten. Welche Daten
            diese Protokolle konkret enthalten und wie lange sie gespeichert
            werden, ist für Vercel nicht verifiziert und muss anhand der
            Projekteinstellungen und Providerbedingungen geprüft werden.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Zwecke und Rechtsgrundlagen</h2>
        <p>
          Personenbezogene Daten werden verarbeitet, soweit dies zur Bereitstellung
          und zum Betrieb der Anwendung erforderlich ist. Dazu gehören insbesondere
          die Registrierung und Anmeldung, die Verwaltung des Benutzerkontos,
          das Hochladen und Speichern von Audiodateien, die Verwaltung von Playlists
          und gespeicherten Inhalten sowie die Bereitstellung angeforderter Freigabelinks.
        </p>
        <p className="mt-3">
          Die Verarbeitung erfolgt auf Grundlage von:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung):</strong> Soweit die
            Verarbeitung für die Bereitstellung der angeforderten Funktionen und die
            Durchführung des Nutzungsverhältnisses erforderlich ist, insbesondere für
            Benutzerkonten, Uploads, Playlists und gespeicherte Inhalte.
          </li>
          <li>
            <strong>Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen):</strong> Soweit
            die Verarbeitung zur Gewährleistung der Sicherheit, Stabilität und
            Funktionsfähigkeit der Anwendung sowie zur Erkennung und Vermeidung von
            Missbrauch erforderlich ist. Das berechtigte Interesse liegt im sicheren und
            zuverlässigen Betrieb der Anwendung.
          </li>
        </ul>
        <p className="mt-3">
          Es findet keine Verarbeitung zu Werbe- oder Analysezwecken statt.
        </p>
      </section>

      <section>
        <h2>4. Freigabelinks und öffentliche Audiodateien</h2>
        <p>
          Beim Upload wird für jeden Song ein zufälliges Freigabetoken
          erzeugt. Die öffentliche Freigabeseite löst dieses Token ohne
          Anmeldung in Anzeigenamen und Speicherpfad auf. Wer über einen
          gültigen Link verfügt, kann diese Informationen abrufen.
        </p>
        <p className="mt-3">
          Eine separate Funktion zum Widerrufen oder Erneuern eines
          Song-Tokens ist derzeit nicht vorhanden. Das Löschen des Songs
          entfernt seine Freigabedaten aus der Anwendung.
        </p>
        <p className="mt-3">
          Der Supabase-Storage-Bucket „songs“ ist öffentlich. Audiodateien
          können daher über ihre öffentliche URL direkt abgerufen werden,
          unabhängig von einem Freigabetoken oder der Share-Seite. Der
          Freigabetoken dient dazu, über die Share-API Song-Metadaten und den
          Speicherpfad abzurufen; er schützt die Audiodatei selbst nicht vor
          direktem Zugriff. Freigabelinks sind nicht passwortgeschützt und
          bieten keinen vertraulichen Zugriffsschutz. Teile darüber keine
          Inhalte, die nicht öffentlich zugänglich sein dürfen.
        </p>
        <p className="mt-3">
          Anonyme Besucher können Song-Metadaten nur über die dedizierte
          Share-API abrufen. Die geprüften RLS-Richtlinien beschränken das
          Ändern und Löschen von Songs und Playlists auf die jeweiligen
          Nutzerinnen und Nutzer.
        </p>
      </section>

      <section>
        <h2>5. Cookies und lokaler Speicher</h2>
        <p>
          Die Anwendung verwendet keine eigenen Cookies, keine
          Analyse-Technologien und kein Werbetracking. Supabase Auth
          speichert die angemeldete Sitzung standardmäßig im lokalen
          Browserspeicher (localStorage), damit die Anmeldung zwischen
          Seitenaufrufen bestehen bleibt. Dies dient der Konto- und
          Anwendungsfunktion.
        </p>
      </section>

      <section>
        <h2>6. Dienstleister und Speicherorte</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Supabase:</strong> Authentifizierung, Datenbank und
            Speicherung der Audiodateien.
          </li>
          <li>
            <strong>Vercel:</strong> Hosting und Bereitstellung der
            Next.js-Anwendung und ihrer API-Routen.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Speicherdauer und Löschung</h2>
        <p>
          Es besteht keine automatische Aufbewahrungsfrist für Konten, Songs
          oder Playlists. Die Daten werden grundsätzlich so lange gespeichert,
          wie das Benutzerkonto besteht oder die jeweiligen Inhalte für die
          Bereitstellung der Anwendung benötigt werden.
        </p>
        <p className="mt-3">
          Nutzer können eigene Songs und Playlists löschen sowie gespeicherte
          Inhalte entfernen. Die Kontolöschfunktion entfernt das Konto,
          zugehörige Songs und Playlists, gespeicherte Verweise und zugehörige
          Audiodateien.
        </p>
        <p className="mt-3">
          Die Löschung erfolgt in mehreren aufeinanderfolgenden Schritten und
          nicht als atomare Gesamtoperation. Schlägt ein Schritt fehl, kann eine
          teilweise Löschung zurückbleiben und eine manuelle Nachbereinigung
          erforderlich sein. Providerseitige Sicherungskopien, Caches und Protokolle
          werden dadurch nicht notwendigerweise sofort entfernt.
        </p>
        <p className="mt-3">
          Abweichende Speicherfristen können sich aus gesetzlichen Pflichten sowie
          aus technischen Sicherungs- und Protokollierungsprozessen der Dienstleister ergeben.
        </p>
      </section>

      <section>
        <h2>8. Ihre Rechte</h2>
        <p>
          Nach Maßgabe der DSGVO können betroffene Personen insbesondere
          Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und – sofern einschlägig – Widerspruch
          verlangen. Eine erteilte Einwilligung kann mit Wirkung für die
          Zukunft widerrufen werden. Anfragen richten Sie an die oben
          angegebene Kontaktadresse.
        </p>
        <p className="mt-3">
          Außerdem besteht das Recht, sich bei einer zuständigen
          Datenschutzaufsichtsbehörde zu beschweren. Die zuständige Aufsichtsbehörde kann insbesondere eine Datenschutzaufsichtsbehörde in Deutschland sein.
        </p>
      </section>
    </LegalPageLayout>
  );
}
