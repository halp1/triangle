import type { Social } from "../../types";

export interface RelationshipSnapshot {
  id: string;
  relationshipID: string;
  username: string;
  avatar: number;
  dms: Social.DM[];
  dmsLoaded: boolean;
}

export interface SocialSnapshot {
  online: number;
  friends: RelationshipSnapshot[];
  others: RelationshipSnapshot[];
  blocked: Social.Blocked[];
  notifications: Social.Notification[];
  config: Social.Config;
}
