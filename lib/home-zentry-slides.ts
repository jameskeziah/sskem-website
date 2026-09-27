// Private-review-only photographic hero. Keep the exact images in the local
// hero-drafts folder until source, guardian-consent and management approval.
// Crop and preview positions are provisional art-direction settings, NOT measured
// against the unpublished source photographs. Confirm on local private review.
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
  compositionFamily: "architectural" | "editorial" | "kinetic" | "showcase";
  palette: Readonly<{ ink: string; paper: string; accent: string; highlight: string; motif: string }>;
  imageCrop: Readonly<{ desktop: string; tablet: string; mobile: string }>;
  previewPlacement: Readonly<{ desktop: Readonly<{ top?: string; right?: string; bottom?: string; left?: string; transform?: string }> }>;
  motif: "architecture" | "pathway" | "science" | "motion" | "digital" | "culture" | "sport";
  entrance: "standard" | "energetic" | "graceful";
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
    compositionFamily: "architectural",
    palette: { ink: "#102b44", paper: "#fffaf2", accent: "#ff697d", highlight: "#ff8d9c", motif: "#ffbdac" },
    imageCrop: { desktop: "58% 48%", tablet: "60% 48%", mobile: "62% 50%" },
    previewPlacement: { desktop: {"top":"45%","left":"66%","transform":"translate(-50%, -50%)"} },
    layout: "slash",
    motif: "architecture",
    entrance: "standard",
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
    compositionFamily: "architectural",
    palette: { ink: "#4b3146", paper: "#fff8e7", accent: "#ff806f", highlight: "#ffc0a1", motif: "#ffe0be" },
    imageCrop: { desktop: "62% 48%", tablet: "62% 49%", mobile: "61% 50%" },
    previewPlacement: { desktop: {"top":"20%","right":"5.5%","transform":"none"} },
    layout: "curve",
    motif: "pathway",
    entrance: "standard",
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
    compositionFamily: "editorial",
    palette: { ink: "#0c2944", paper: "#f6fff9", accent: "#74d9df", highlight: "#a7eaf0", motif: "#a7eaf0" },
    imageCrop: { desktop: "65% 45%", tablet: "66% 46%", mobile: "65% 46%" },
    previewPlacement: { desktop: {"bottom":"15%","right":"5.5%","transform":"none"} },
    layout: "frame",
    motif: "science",
    entrance: "standard",
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
    compositionFamily: "kinetic",
    palette: { ink: "#09243d", paper: "#fff8ef", accent: "#ff778b", highlight: "#ff9675", motif: "#ff846b" },
    imageCrop: { desktop: "63% 42%", tablet: "64% 43%", mobile: "63% 44%" },
    previewPlacement: { desktop: {"top":"14%","right":"5.5%","transform":"none"} },
    layout: "chevron",
    motif: "motion",
    entrance: "energetic",
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
    compositionFamily: "editorial",
    palette: { ink: "#102d47", paper: "#f8fdff", accent: "#74d8df", highlight: "#9cebf0", motif: "#9ae4ed" },
    imageCrop: { desktop: "66% 45%", tablet: "66% 46%", mobile: "65% 47%" },
    previewPlacement: { desktop: {"bottom":"14%","right":"23%","transform":"none"} },
    layout: "grid",
    motif: "digital",
    entrance: "standard",
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
    compositionFamily: "showcase",
    palette: { ink: "#342b3e", paper: "#fff6e7", accent: "#fa8d87", highlight: "#ffca9e", motif: "#ffceaa" },
    imageCrop: { desktop: "61% 47%", tablet: "61% 48%", mobile: "60% 48%" },
    previewPlacement: { desktop: {"top":"14%","right":"5%","transform":"none"} },
    layout: "ribbon",
    motif: "culture",
    entrance: "graceful",
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
    compositionFamily: "kinetic",
    palette: { ink: "#0b333d", paper: "#fffbee", accent: "#ff8b6b", highlight: "#ffe4a0", motif: "#fff0aa" },
    imageCrop: { desktop: "64% 48%", tablet: "64% 48%", mobile: "63% 48%" },
    previewPlacement: { desktop: {"top":"16%","right":"5%","transform":"none"} },
    layout: "sport",
    motif: "sport",
    entrance: "energetic",
  },
]);

export const homeZentryFallbackPhoto = "/media/home/campus-main.jpeg";
