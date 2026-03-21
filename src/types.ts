export type UserRole = 'Usuario' | 'UserPro' | 'Patrocinador' | 'Admin' | 'Ghost';

export interface UserProfile {
  uid: string;
  name: string;
  phone?: string;
  profile_image?: string;
  role: UserRole;
  bio?: string;
  xp_total: number;
  level: number;
  current_streak: number;
  last_run_date?: string;
  total_km: number;
  city?: string;
}

export interface Run {
  id: string;
  user_id: string;
  user_name: string;
  user_image?: string;
  distance: number; // in km
  duration: number; // in seconds
  pace: number; // min/km
  route: { lat: number; lng: number }[];
  created_at: any;
  likes?: string[]; // array of user uids
  comments?: Comment[];
}

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_image?: string;
  text: string;
  created_at: any;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  image?: string;
  location: string;
  date_time: string;
  created_by: string;
  participant_count: number;
  participants?: string[]; // array of user uids
}

export interface Ad {
  id: string;
  title: string;
  image_url: string;
  link: string;
  active: boolean;
}

export interface Medal {
  id: string;
  name: string;
  description: string;
  icon: string;
  date_earned: string;
}
