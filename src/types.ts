export interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  photos?: { photo_reference: string }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now: boolean;
  };
  hasApp?: boolean;
  hasSite?: boolean;
  website?: string;
  formatted_phone_number?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}
