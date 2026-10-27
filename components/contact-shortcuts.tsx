import { siteFacts } from "@/app/data/site";

const whatsappUrl = `https://wa.me/91${siteFacts.mobile}?text=${encodeURIComponent(
  "Hello SSKEMS, I would like to enquire about the school.",
)}`;

export function ContactShortcuts() {
  return (
    <nav className="contact-shortcuts" aria-label="School contact shortcuts">
      <a
        className="contact-shortcuts__link contact-shortcuts__link--whatsapp"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Message SSKEMS on WhatsApp at ${siteFacts.mobile}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.2 19.7 3 21l1.3-4.2A9 9 0 1 1 7.2 19.7Z" />
          <path d="m8.2 8.3 1.1-.5 1.2 2.2-.9 1c.6 1.1 1.7 2.2 2.9 2.8l1-.9 2.3 1.2-.5 1.2c-.4 1-1.6 1.3-2.7.9-3.1-1.2-5.4-3.6-6.6-6.6-.4-1.1-.1-2.2 1.2-2.3Z" />
        </svg>
        <span>WhatsApp</span>
      </a>
      <a
        className="contact-shortcuts__link contact-shortcuts__link--call"
        href={`tel:${siteFacts.phone}`}
        aria-label={`Call SSKEMS school office at ${siteFacts.phone}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16.4v3a2 2 0 0 1-2.2 2 17.8 17.8 0 0 1-7.7-2.7 17.4 17.4 0 0 1-5.3-5.3 17.8 17.8 0 0 1-2.7-7.8A2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L8.3 11a14 14 0 0 0 4.7 4.7l1.5-1.7a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2.5Z" />
        </svg>
        <span>Call School</span>
      </a>
    </nav>
  );
}
