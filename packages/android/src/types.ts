export interface Asset {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  description: string | null;
  uploaded_at: number;
  updated_at: number;
  share_token: string | null;
  tags: string[];
}
