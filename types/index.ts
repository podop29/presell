export interface Preview {
  id: string;
  slug: string;
  original_url: string;
  original_screenshot: string | null;
  redesign_html: string;
  style_name: string | null;
  dev_name: string;
  dev_email: string;
  dev_message: string | null;
  created_at: string;
  expires_at: string;
  variation_a_html: string | null;
  variation_a_style: string | null;
  variation_b_html: string | null;
  variation_b_style: string | null;
  variation_c_html: string | null;
  variation_c_style: string | null;
  user_id: string | null;
  business_name: string | null;
}

export interface AnalyzeRequest {
  url?: string;
  mapsUrl?: string;
  source: "website" | "google-maps";
}

export interface StockImages {
  hero: string[];
  secondary: string[];
  atmosphere: string[];
}

export interface AnalyzeResponse {
  profile: BusinessProfile;
  styles: StyleSuggestion[];
  pageStructure: string[];
  imageUrls: string[];
  stockImageUrls: string[];
  stockImages?: StockImages;
  pageContent: string;
  classifiedImages: ClassifiedImage[];
}

export interface GenerateRequest {
  url: string;
  devName?: string;
  devEmail?: string;
  devMessage?: string;
  profile: BusinessProfile;
  selectedStyle: StyleSuggestion;
  pageStructure: string[];
  imageUrls: string[];
  stockImageUrls: string[];
  stockImages?: StockImages;
  pageContent: string;
  customInstructions?: string;
  classifiedImages?: ClassifiedImage[];
}

export interface GenerateResponse {
  slug: string;
  previewUrl: string;
}

export interface ScrapedData {
  title: string;
  description: string;
  content: string;
  imageUrls: string[];
  screenshot: string;
}

export interface BusinessProfile {
  businessName: string;
  businessType: "local" | "digital";
  industry: string;
  whatTheyDo: string;
  targetCustomer: string;
  keySellingPoints: string[];
  brandTone: string;
  primaryColors: string;
  location: string;
}

export interface StyleSuggestion {
  styleName: string;
  styleBrief: string;
}

export interface ClassifiedImage {
  url: string;
  category: "logo" | "hero-worthy" | "product" | "team" | "storefront" | "gallery" | "screenshot" | "decorative" | "skip";
  description: string;
}

export interface AnalysisResult {
  profile: BusinessProfile;
  styles: StyleSuggestion[];
  pageStructure: string[];
  imageSearchQueries: string[];
  classifiedImages: ClassifiedImage[];
}

/* ── Design Blueprint (multi-pass pipeline) ── */

export interface SectionBlueprint {
  id: string;
  sectionType: string;
  layoutPattern: string;
  headline: string;
  subheadline?: string;
  contentNotes: string;
  imageStrategy: {
    source: "classified" | "stock-hero" | "stock-secondary" | "stock-atmosphere" | "none";
    url?: string;
    fallback: string;
  };
  backgroundColor: string;
  textColor: string;
  componentChoices: string[];
  animationApproach: string;
  estimatedLines: number;
}

export interface DesignBlueprint {
  globalTypography: {
    displayFont: string;
    bodyFont: string;
    heroSize: string;
    sectionHeadingSize: string;
  };
  colorSystem: {
    primary: string;
    secondary: string;
    accent: string;
    backgroundLight: string;
    backgroundDark: string;
    textOnLight: string;
    textOnDark: string;
  };
  navStyle: string;
  footerStyle: string;
  sections: SectionBlueprint[];
  totalEstimatedLines: number;
  designRationale: string;
}

/* ── Visual QA ── */

export interface QAIssue {
  severity: "critical" | "major" | "minor";
  sectionId: string;
  issueType: "contrast" | "layout" | "overflow" | "missing-content" | "broken-image" | "spacing" | "alignment";
  description: string;
  suggestedFix: string;
  /**
   * "measured" issues come from browser checks and are re-testable on every
   * render; "review" issues come from the vision reviewer and can only be
   * re-tested by another review.
   */
  source?: "measured" | "review";
}

export interface QAResult {
  pass: boolean;
  score: number;
  issues: QAIssue[];
}

/**
 * Outcome of the QA stage. "skipped" means QA could not run (render or API
 * failure) — distinct from "passed" so a QA outage isn't mistaken for a clean
 * site.
 */
export type QAStatus = "passed" | "fixed" | "failed" | "skipped";

export type QAViewport = "desktop" | "mobile";

/**
 * A defect measured directly in the browser rather than eyeballed in a
 * screenshot. `evidence` is the offending element's opening tag, which gives
 * the fix pass a concrete string to search for in the HTML source.
 */
export interface DomFinding {
  severity: QAIssue["severity"];
  issueType: QAIssue["issueType"];
  viewport: QAViewport;
  description: string;
  suggestedFix: string;
  evidence: string;
}

/* ── Generation Pipeline ── */

export type PipelineStage =
  | "blueprint"
  | "generating"
  | "qa-screenshot"
  | "qa-review"
  | "qa-fix"
  | "qa-verify"
  | "regenerating"
  | "finalizing";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  iteration?: number;
}

export interface PipelineInput {
  profile: BusinessProfile;
  selectedStyle: StyleSuggestion;
  pageStructure: string[];
  pageContent: string;
  imageUrls: string[];
  stockImageUrls: string[];
  stockImages?: StockImages;
  classifiedImages?: ClassifiedImage[];
  customInstructions?: string;
}

export interface PipelineResult {
  html: string;
  blueprint: DesignBlueprint;
  qaIterations: number;
  finalScore: number;
  qaStatus: QAStatus;
  /** Critical/major issues still present in the shipped HTML. */
  remainingIssues: QAIssue[];
  /** True when the first attempt was thrown away and the page rebuilt. */
  regenerated: boolean;
}
