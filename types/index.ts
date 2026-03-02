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
}

export interface AnalyzeRequest {
  url: string;
}

export interface AnalyzeResponse {
  profile: BusinessProfile;
  styles: [StyleSuggestion, StyleSuggestion, StyleSuggestion];
  pageStructure: string[];
  imageUrls: string[];
  stockImageUrls: string[];
}

export interface GenerateRequest {
  url: string;
  devName: string;
  devEmail: string;
  devMessage?: string;
  profile: BusinessProfile;
  selectedStyle: StyleSuggestion;
  pageStructure: string[];
  imageUrls: string[];
  stockImageUrls: string[];
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

export interface AnalysisResult {
  profile: BusinessProfile;
  styles: [StyleSuggestion, StyleSuggestion, StyleSuggestion];
  pageStructure: string[];
  imageSearchQueries: string[];
}
