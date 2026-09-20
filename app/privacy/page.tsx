import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How BgGone handles images, browser preferences, and technical request data.",
};

const email = "dariel.v.avila@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="PRIVACY"
      title="Privacy Policy"
      intro="BgGone is designed to remove backgrounds without asking you to create an account or hand over personal details."
      sections={[
        {
          title: "Information we collect",
          paragraphs: [
            "BgGone has no user accounts and does not intentionally collect or store names, email addresses, profiles, or other personal information.",
            "The website does not use advertising trackers or analytics cookies.",
          ],
        },
        {
          title: "Images and processing",
          paragraphs: [
            "An image stays in your browser until you choose to process it. It is then sent to the BgGone API solely to perform the requested background-removal or editing operation.",
            "Single-image requests are processed in memory and are not intentionally retained by BgGone after the response is returned.",
          ],
        },
        {
          title: "Data kept in your browser",
          paragraphs: [
            "BgGone stores your theme preference and certain connection settings in your browser. The filenames of up to three recent images may be kept for the current browser session.",
            "This browser-local information remains on your device and can be cleared using your browser controls.",
          ],
        },
        {
          title: "Technical services",
          paragraphs: [
            "BgGone uses Heroku to host the website and image-processing API. Like most hosting providers, Heroku may process an IP address and basic request information needed to deliver, secure, and operate the service.",
            "If you follow a link to GitHub, that service handles the visit under its own privacy practices. BgGone does not sell personal information.",
          ],
        },
        {
          title: "Privacy inquiries",
          paragraphs: [
            <>
              Questions about this policy or the handling of your data can be sent to{" "}
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
