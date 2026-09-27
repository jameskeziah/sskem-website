// Private-review-only photographic hero. Keep the exact images in the local
// hero-drafts folder until source, guardian-consent and management approval.
export type HomeZentrySlide = Readonly<{
  id: string;
  chapter: string;
  eyebrow: string;
  headline: string;
  lines: readonly string[];
  accentLine: number;
  description: string;
  image: string;
  preview: string;
  alt: string;
  focal: string;
  layout: "slash" | "curve" | "frame" | "chevron" | "grid" | "ribbon" | "sport";
}>;

const path = "/media/home/hero-drafts/";

export const homeZentrySlides: readonly HomeZentrySlide[] = Object.freeze([
  {
    id: "campus",
    chapter: "01",
    eyebrow: "SSKEMS · Veral",
    headline: "Here, possibility begins.",
    lines: ["HERE,", "POSSIBILITY", "BEGINS."],
    accentLine: 1,
    description: "Discover a place to learn, explore and grow.",
    image: `${path}campus.webp`,
    preview: `${path}campus-preview.webp`,
    alt: "Exterior of the SSKEMS campus, with the pink school building and open ground.",
    focal: "53% 50%",
    layout: "slash",
  },
  {
    id: "entrance",
    chapter: "02",
    eyebrow: "Welcome to SSKEMS",
    headline: "Where journeys begin.",
    lines: ["WHERE", "JOURNEYS", "BEGIN."],
    accentLine: 1,
    description: "Step inside our school community.",
    image: `${path}entrance.webp`,
    preview: `${path}entrance-preview.webp`,
    alt: "Front entrance of Shree Samarth Krupa English Medium School in Veral.",
    focal: "63% 46%",
    layout: "curve",
  },
  {
    id: "science",
    chapter: "03",
    eyebrow: "Hands-on learning",
    headline: "Learn. Create. Discover.",
    lines: ["LEARN.", "CREATE.", "DISCOVER."],
    accentLine: 1,
    description: "Curiosity takes shape through real-world experiments.",
    image: `${path}science.webp`,
    preview: `${path}science-preview.webp`,
    alt: "SSKEMS students working together on experiments in a science laboratory.",
    focal: "66% 45%",
    layout: "frame",
  },
  {
    id: "skating",
    chapter: "04",
    eyebrow: "Beyond the classroom",
    headline: "Confidence in motion.",
    lines: ["CONFIDENCE", "IN MOTION."],
    accentLine: 1,
    description: "Explore movement, sport and new skills.",
    image: `${path}skating.webp`,
    preview: `${path}skating-preview.webp`,
    alt: "Students practising inline skating outdoors on school grounds.",
    focal: "62% 40%",
    layout: "chevron",
  },
  {
    id: "digital",
    chapter: "05",
    eyebrow: "Digital learning",
    headline: "Skills for a smarter tomorrow.",
    lines: ["SKILLS FOR A", "SMARTER", "TOMORROW."],
    accentLine: 1,
    description: "Developing digital confidence through practical learning.",
    image: `${path}digital.webp`,
    preview: `${path}digital-preview.webp`,
    alt: "SSKEMS students using desktop computers during a computer laboratory session.",
    focal: "67% 46%",
    layout: "grid",
  },
  {
    id: "culture",
    chapter: "06",
    eyebrow: "Cultural expression",
    headline: "Explore. Express. Excel.",
    lines: ["EXPLORE.", "EXPRESS.", "EXCEL."],
    accentLine: 1,
    description: "Creativity, culture and confidence beyond academics.",
    image: `${path}culture.webp`,
    preview: `${path}culture-preview.webp`,
    alt: "Students performing a traditional cultural programme in the school hall.",
    focal: "61% 49%",
    layout: "ribbon",
  },
  {
    id: "sports",
    chapter: "07",
    eyebrow: "Sports and wellness",
    headline: "Play. Learn. Grow.",
    lines: ["PLAY.", "LEARN.", "GROW."],
    accentLine: 1,
    description: "Building teamwork, resilience and friendships through sport.",
    image: `${path}sports.webp`,
    preview: `${path}sports-preview.webp`,
    alt: "SSKEMS students taking part in an outdoor sports activity.",
    focal: "66% 48%",
    layout: "sport",
  },
]);

export const homeZentryFallbackPhoto = "/media/home/campus-main.jpeg";
