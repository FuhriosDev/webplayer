import type { Metadata } from "next";
import LegalPageLayout from "@/app/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Impressum | Webplayer",
  description: "Anbieterkennzeichnung für Webplayer.",
};

export default function LegalNoticePage() {
  return (
    <LegalPageLayout title="Impressum">
      <section>
        <h2>Angaben zum Betreiber</h2>
        <address className="not-italic">
          Marvin Fuhr
          <br />
          Ringstr. 4a
          <br />
          85604 Zorneding
          <br />
          Deutschland
        </address>
        <p className="mt-3">
          E-Mail: online@marvin-fuhr.de
        </p>
      </section>
    </LegalPageLayout>
  );
}
