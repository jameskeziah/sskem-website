import { siteFacts } from "@/app/data/site";

const whatsappUrl = `https://wa.me/91${siteFacts.mobile}?text=${encodeURIComponent(
  "Hello SSKEMS, I would like to know more about the school and admissions.",
)}`;

/**
 * Compact, always-available contact buttons used on every public page.
 * Ordinary links work without JavaScript and avoid third-party widgets.
 */
export function ContactShortcuts() {
  return (
    <nav className="contact-shortcuts" aria-label="School contact shortcuts">
      <a
        className="contact-shortcuts__link contact-shortcuts__link--whatsapp"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with SSKEMS on WhatsApp at ${siteFacts.mobile}`}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.601 2.326A7.854 7.854 0 0 0 8.012 0C3.666 0 .132 3.533.13 7.879c0 1.388.362 2.743 1.05 3.938L.063 15.9l4.18-1.097a7.87 7.87 0 0 0 3.768.96h.003c4.345 0 7.878-3.533 7.88-7.879a7.826 7.826 0 0 0-2.293-5.558zm-5.59 12.108a6.52 6.52 0 0 1-3.324-.91l-.238-.141-2.478.65.662-2.416-.155-.249a6.52 6.52 0 0 1-1-3.49c.002-3.607 2.938-6.54 6.541-6.54a6.493 6.493 0 0 1 4.634 1.92 6.493 6.493 0 0 1 1.914 4.638c-.001 3.607-2.936 6.54-6.556 6.54zm3.587-4.883c-.196-.098-1.16-.573-1.34-.639-.18-.065-.31-.098-.442.099-.13.196-.508.639-.623.77-.115.131-.23.147-.426.049-.197-.098-.829-.305-1.58-.973-.585-.52-.98-1.16-1.095-1.356-.115-.197-.012-.303.086-.4.088-.088.197-.23.295-.344.098-.115.131-.197.197-.328.065-.131.032-.246-.016-.344-.05-.098-.443-1.066-.607-1.46-.16-.383-.323-.331-.442-.338a7.5 7.5 0 0 0-.377-.007c-.131 0-.344.049-.524.246-.18.196-.688.672-.688 1.639s.704 1.9.803 2.032c.098.131 1.384 2.113 3.354 2.963.468.202.833.322 1.118.412.47.15.898.129 1.236.078.377-.056 1.16-.475 1.324-.934.164-.459.164-.852.115-.934-.049-.082-.18-.131-.377-.23z" />
        </svg>
        <span>WhatsApp</span>
      </a>
      <a
        className="contact-shortcuts__link contact-shortcuts__link--call"
        href={`tel:${siteFacts.phone}`}
        aria-label={`Call SSKEMS school office at ${siteFacts.phone}`}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16.4v3a2 2 0 0 1-2.2 2 17.8 17.8 0 0 1-7.7-2.7 17.4 17.4 0 0 1-5.3-5.3 17.8 17.8 0 0 1-2.7-7.8A2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L8.3 11a14 14 0 0 0 4.7 4.7l1.5-1.7a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2.5Z" />
        </svg>
        <span>Call School</span>
      </a>
      <a
        className="contact-shortcuts__link contact-shortcuts__link--youtube"
        href={siteFacts.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Watch videos on the official SSKEMS YouTube channel"
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.6 6.4a2.8 2.8 0 0 0-2-2C18.8 3.9 12 3.9 12 3.9s-6.8 0-8.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .4 5.6 2.8 2.8 0 0 0 2 2c1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.4-5.6ZM9.75 15.9V8.1L16.5 12l-6.75 3.9Z" fillRule="evenodd" />
        </svg>
        <span>YouTube</span>
      </a>
    </nav>
  );
}
