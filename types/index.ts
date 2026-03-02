export interface Preview {
  id: string;
  slug: string;
  original_url: string;
  original_screenshot: string | null;
  redesign_html: string;
  dev_name: string;
  dev_email: string;
  dev_message: string | null;
  created_at: string;
  expires_at: string;
}

export interface GenerateRequest {
  url: string;
  devName: string;
  devEmail: string;
  devMessage?: string;
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
