export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'OFFICER';
}

export interface MissingChild {
  id: number;
  name: string;
  age: number;
  gender: string;
  location: string;
  photo_url: string;
  description: string;
  status: string;
  created_at: string;
}

export interface FoundChild {
  id: number;
  photo_url: string;
  location: string;
  description: string;
  reporter_contact: string;
  created_at: string;
}

export interface MatchResult {
  id: number;
  missing_child_id: number;
  found_child_id: number;
  confidence_score: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  ai_analysis: string;
  created_at: string;
  missing_name: string;
  missing_photo: string;
  found_photo: string;
  found_location: string;
}
