import type { Metadata } from "next";
import LegalPageLayout from "@/app/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | Webplayer",
  description: "Entwurf der Nutzungsbedingungen für Webplayer.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Nutzungsbedingungen">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Version: 27. November 2026
      </p>

      <section>
        <h2>1. Geltungsbereich und Anbieter</h2>
        <p>
          Diese Bedingungen beschreiben die Nutzung von Webplayer, einer
          persönlichen Anwendung zum Hochladen, Ordnen und Teilen von
          Musikdateien. Anbieter ist Marvin Fuhr, Ringstr. 4a, 85604 Zorneding, DE.
        </p>
        <p className="mt-3">
          Die Anwendung wird derzeit privat und ohne Monetarisierung
          betrieben. Das befreit Nutzerinnen und Nutzer nicht von
          Urheberrechts- oder sonstigen gesetzlichen Pflichten.
        </p>
      </section>

      <section>
        <h2>2. Konto und verantwortungsvolle Nutzung</h2>
        <p>
          Für persönliche Bibliotheken ist ein Konto erforderlich. Nutzer
          müssen bei der Anmeldung zutreffende Kontodaten verwenden und ihre
          Zugangsdaten vertraulich behandeln. Konten und Zugangsdaten dürfen
          nicht mit unbefugten Dritten geteilt werden. Nutzer informieren den
          Betreiber über eine vermutete unbefugte Kontonutzung. Ein Konto darf
          nicht für rechtswidrige Zwecke oder zur Beeinträchtigung des Dienstes
          verwendet werden.
        </p>
      </section>

      <section>
        <h2>3. Hochgeladene Inhalte und Rechte</h2>
        <p>
          Es dürfen nur Audiodateien hochgeladen und geteilt werden, für die
          die nutzende Person alle erforderlichen Rechte, Lizenzen und
          Zustimmungen besitzt. Das umfasst die Rechte zum Hochladen und
          Speichern sowie – wenn die Sharing-Funktion verwendet wird – zum
          öffentlichen Zugänglichmachen. Das gilt insbesondere für Musik,
          Tonaufnahmen, Darbietungen, Samples und eingebettete Werke.
        </p>
        <p className="mt-3">
          Die nutzende Person bleibt für ihre Inhalte verantwortlich und
          sichert zu, dass Upload und Freigabe keine Rechte Dritter und keine
          Gesetze verletzen. Für die Dauer der Speicherung räumt die nutzende
          Person dem Betreiber ein nicht ausschließliches Nutzungsrecht ein,
          das auf die technisch erforderliche Speicherung, Vervielfältigung
          und Bereitstellung der Inhalte über die von ihr angeforderten
          Anwendungsfunktionen beschränkt ist. Wählt sie ausdrücklich eine
          Freigabe, umfasst dieses Recht auch die Bereitstellung über
          öffentlich zugängliche Links. Die Rechte und das Eigentum an den
          Inhalten verbleiben bei der nutzenden Person; eine weitergehende
          Übertragung von Urheberrechten ist nicht beabsichtigt.
          Eine Nutzung der Inhalte zu eigenen Werbe-, kommerziellen oder
          sonstigen nicht vom Nutzer angeforderten Zwecken durch den Betreiber
          findet nicht statt.
        </p>
      </section>

      <section>
        <h2>4. Teilen über öffentliche Links</h2>
        <p>
          Eine Freigabe erzeugt einen Link, der ohne Anmeldung aufgerufen
          werden kann. Wer den Link erhält, kann ihn weitergeben. Der
          Supabase-Storage-Bucket „songs“ ist öffentlich. Audiodateien können
          über ihre öffentliche URL direkt abgerufen werden, unabhängig vom
          Freigabetoken. Das Token ist kein Passwort und schützt die Datei
          nicht vor direktem Zugriff. Freigabelinks sind nicht
          passwortgeschützt und nicht vertraulich.
        </p>
        <p className="mt-3">
          Der Betreiber kann nicht kontrollieren, wer einen freigegebenen Link
          erhält oder ihn weiterverbreitet.
        </p>
        <p className="mt-3">
          Teile keine Inhalte über öffentliche Links, die vertraulich sind
          oder nicht öffentlich zugänglich gemacht werden dürfen. Nach
          erfolgreicher Löschung des Songs werden die zugehörigen Freigabedaten
          und die gespeicherte Audiodatei aus der Anwendung entfernt.
          Bereits heruntergeladene oder außerhalb der Anwendung gespeicherte
          Kopien können davon nicht erfasst werden.
        </p>
      </section>

      <section>
        <h2>5. Verbotene Inhalte und Meldungen</h2>
        <p>
          Unzulässig sind insbesondere Inhalte, für die keine ausreichenden
          Rechte bestehen, rechtswidrige oder schädigende Inhalte sowie
          Uploads, die Sicherheits- oder Betriebsstörungen verursachen sollen.
        </p>
        <p className="mt-3">
          Hinweise auf mögliche Urheberrechts- oder sonstige
          Rechtsverletzungen können an{" "}
          <a
            href="mailto:online@marvin-fuhr.de"
            className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            online@marvin-fuhr.de
          </a>{" "}
          gesendet werden. Meldungen werden geprüft. Bitte beschreibe den
          betroffenen Inhalt oder Link, das verletzte Recht und deine
          Kontaktdaten; füge eine Erklärung bei, dass die Angaben nach bestem
          Wissen zutreffen. Gibt es nachvollziehbare Anhaltspunkte dafür, dass
          ein Inhalt gegen anwendbare Gesetze oder Rechte Dritter verstößt,
          kann der Betreiber ihn entfernen und erforderlichenfalls den
          Kontozugang vorübergehend sperren.
        </p>
        <p className="mt-3">
          Die angegebene Kontaktadresse muss vor Veröffentlichung auf
          Richtigkeit geprüft und tatsächlich überwacht werden.
        </p>
      </section>

      <section>
        <h2>6. Löschen und Beenden der Nutzung</h2>
        <p>
          Nutzer können einzelne eigene Songs und Playlists löschen,
          gespeicherte Einträge entfernen und ihr Konto über die
          Kontoverwaltung löschen. Die Kontolöschfunktion
          entfernt das Konto, zugehörige Songs und Playlists,
          gespeicherte Verweise und Audiodateien. Die einzelnen Schritte
          erfolgen nacheinander und nicht atomar. Bei einem Fehler kann eine
          teilweise Löschung zurückbleiben und manuelle Nachbereinigung
          erforderlich sein. Gesetzliche Aufbewahrungspflichten sowie
          providerseitige Sicherungskopien, Caches und Protokolle können davon
          unberührt bleiben.
        </p>
        <p className="mt-3">
          Eine vorübergehende Kontosperrung schränkt den Zugang zur Anwendung
          ein, löscht aber weder das Konto noch die zugehörigen Inhalte.
          Bei einer dauerhaften Kontolöschung werden die dem Konto zugeordneten
          Daten und Inhalte im Rahmen des beschriebenen Löschprozesses entfernt.
          Der Betreiber kann Konten bei Rechtsverletzungen, Sicherheitsrisiken
          oder erheblichem Missbrauch vorübergehend sperren. Über eine
          Sperrung und deren Grund werden Nutzer informiert, soweit dies
          rechtlich und praktisch möglich ist.
        </p>
      </section>

      <section>
        <h2>7. Verfügbarkeit und Haftung</h2>
        <p>
          Die Anwendung wird als privates Projekt bereitgestellt. Eine
          ununterbrochene Verfügbarkeit oder dauerhafte Speicherung wird nicht
          zugesichert. Haftungsbeschränkungen gelten nur, soweit sie nach dem
          jeweils anwendbaren Recht zulässig sind. Zwingende gesetzliche
          Haftung, insbesondere für Vorsatz, grobe Fahrlässigkeit, Schäden an
          Leben, Körper oder Gesundheit und zwingende Produkthaftung, bleibt
          unberührt.
        </p>
      </section>
    </LegalPageLayout>
  );
}
