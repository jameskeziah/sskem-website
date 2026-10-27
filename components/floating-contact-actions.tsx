import { siteFacts } from "@/app/data/site";

function toIndianInternationalNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function ContactIcon({ kind }: { kind: "whatsapp" | "call" | "sms" }) {
  if (kind === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 11.6a8 8 0 0 1-11.8 7l-4.5 1.6 1.5-4.5A8 8 0 1 1 20 11.6Z" />
        <path d="M8.7 8.5c.4-.3.8-.1 1 .3l.6 1.3c.1.3 0 .6-.2.8l-.5.5a5.4 5.4 0 0 0 2.9 2.9l.6-.6c.2-.2.5-.3.8-.1l1.3.6c.5.2.6.6.3 1-.4.6-1.1.9-1.9.8-3.1-.4-5.8-3.1-6.2-6.2-.1-.8.2-1.5.8-1.9Z" transform="translate(0 1.3) scale(.95)" />
      </svg>
    );
  }
  if (kind === "call") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.7 19.7 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.8l-1.6 1.6a16 16 0 0 0 4.7 4.7l1.6-1.6a2 2 0 0 1 1.8-.6l2.8.5a2 2 0 0 1 1.7 2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M8.5 11.5h7" />
      <path d="M8.5 14.5h4" />
    </svg>
  );
}

export function FloatingContactActions() {
  const schoolMobile = toIndianInternationalNumber(siteFacts.mobile);
  const whatsappNumber = toIndianInternationalNumber(
    process.env.NEXT_PUBLIC_SSKEM_WHATSAPP_NUMBER || siteFacts.mobile,
  );
  const enquiryMessage = encodeURIComponent(
    "Hello, I would like to enquire about admissions at SSKEMS.",
  );

  return (
    <nav className="contact-dock" aria-label="Quick contact options">
      <a
        className="contact-dock__link contact-dock__link--whatsapp"
        href={`https://wa.me/${whatsappNumber}?text=${enquiryMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with SSKEMS on WhatsApp"
        title="Chat on WhatsApp"
      >
        <ContactIcon kind="whatsapp" />
        <span className="contact-dock__label">WhatsApp</span>
      </a>
      <a
        className="contact-dock__link"
        href={`tel:+${schoolMobile}`}
        aria-label="Call SSKEMS"
        title="Call SSKEMS"
      >
        <ContactIcon kind="call" />
        <span className="contact-dock__label">Call</span>
      </a>
      <a
        className="contact-dock__link"
        href={`sms:+${schoolMobile}`}
        aria-label="Send SSKEMS an SMS"
        title="Send SMS"
      >
        <ContactIcon kind="sms" />
        <span className="contact-dock__label">Message</span>
      </a>
    </nav>
  );
}
