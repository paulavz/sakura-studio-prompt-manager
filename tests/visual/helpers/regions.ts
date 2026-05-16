/**
 * Centralized selectors for visual regression tests.
 * These map to data-region/data-testid attributes that the
 * build stage (Phase 9 Stage 2) must add to components.
 * Until then, specs using these selectors will fail — that
 * is intentional in the test-first workflow.
 */
export const REGIONS = {
  sidebar: '[data-region="sidebar"]',
  galleryGrid: '[data-region="gallery"]',
  galleryCard: '[data-region="gallery"] [data-testid="item-card"]',
  tagChip: '[data-testid="tag-chip"]',
  variableChip: '[data-testid="variable-chip"]',
  viewer: '[data-region="viewer"]',
  threePane: '[data-region="layout-root"]',
  modeToggle: '[data-testid="mode-toggle"]',
} as const;

/**
 * Source-of-truth design values extracted from the mockup SVG.
 * All pixel values are from the viewBox 0 0 400 280.
 */
export const MOCKUP_VALUES = {
  sidebarWidth: 224,
  galleryStart: 85,
  viewerStart: 205,
  separatorColor: "#E8E8E8",
  separatorWidth: 1,
  cardBorderRadius: 6,
  cardBorderHoverColor: "#FFB7C5",
  cardBorderDefaultColor: "#E8E8E8",
  cardBorderHoverWidth: 1.5,
  cardBorderDefaultWidth: 1,
  tagChipNeutralBg: "#F5F5F5",
  tagChipBlueBg: "#E8F4FF",
  tagChipGreenBg: "#F0F8E8",
  tagChipSakuraBg: "rgba(255,183,197,0.5)",
  variableChipBg: "rgba(255,183,197,0.2)",
  variableChipBorderColor: "rgba(255,183,197,0.5)",
  variableChipTextColor: "#C45E78",
  sakuraColor: "#FFB7C5",
  brandingEmoji: "🌸",
} as const;