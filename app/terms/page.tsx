import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when using the BgGone website and background-removal tools.",
};

const email = "dariel.v.avila@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="TERMS"
      title="Terms of Use"
      intro="These terms explain the basic rules for using BgGone. By using the service, you agree to use it responsibly and lawfully."
      sections={[
        {
          title: "Acceptable use",
          paragraphs: [
            "You may use BgGone only for lawful purposes and only with images you own or are authorized to process.",
            "Do not misuse the service, attempt unauthorized access, interfere with its operation, evade limits, upload unlawful or harmful material, or use it to violate another person's rights.",
          ],
        },
        {
          title: "Intellectual property",
          paragraphs: [
            "You retain your rights in images you submit. You grant BgGone only the limited permission needed to process an image and return the requested result.",
            "BgGone's source code is publicly available. Rights in the code, interface, name, and third-party components remain subject to the notices and applicable licenses identified in the repository.",
          ],
        },
        {
          title: "Availability and changes",
          paragraphs: [
            "The service may change, become unavailable, experience delays, or be discontinued at any time. Features, limits, and supported formats may also change without notice.",
          ],
        },
        {
          title: "Provided as is",
          paragraphs: [
            "BgGone is provided on an “as is” and “as available” basis without warranties of accuracy, reliability, fitness for a particular purpose, or uninterrupted operation, to the extent permitted by law.",
            "Background removal is automated and may produce incomplete, inaccurate, or unsuitable results. Review every output before relying on it.",
          ],
        },
        {
          title: "Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, BgGone and its maintainer will not be liable for indirect, incidental, special, consequential, or similar losses arising from use of, inability to use, or reliance on the service.",
          ],
        },
        {
          title: "Third-party services",
          paragraphs: [
            "BgGone relies on third-party infrastructure and may link to services such as Heroku and GitHub. Those services operate under their own terms and policies, and BgGone is not responsible for their availability or conduct.",
          ],
        },
        {
          title: "Changes and contact",
          paragraphs: [
            "These terms may be updated as BgGone changes. The date shown at the top identifies the latest version. Continuing to use the service after an update means you accept the revised terms.",
            <>
              Questions about these terms can be sent to{" "}
              <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </>,
          ],
        },
      ]}
    />
  );
}
