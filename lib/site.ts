// Single place for the study's invented brand and outbound targets.
export const SITE = {
  name: "Meridian",
  wordmark: "MERIDIAN",
  tagline: "The boldest chip foundry ever attempted",
  description:
    "An independent design study of a cinematic, scroll-driven landing page for a fictional chip foundry. Not affiliated with any real company.",
  partners: ["Northline", "Vantage"] as const,
  // CTAs stay on-page: this study does not link to real programmes.
  links: {
    watch: "#mass",
    join: "#join",
    learn: "#scaling",
  },
};
