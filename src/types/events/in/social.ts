import type { Social as SocialTypes } from "../..";

export interface Social {
  "social.online": number;

  "social.dm": SocialTypes.DM;
  "social.dm.fail": "they.fail" | "they.ban" | string;

  "social.presence": {
    user: string;
    presence: {
      status: SocialTypes.Status;
      detail: SocialTypes.Detail | String; // keep this as String for autocomplete
      invitable: boolean;
    };
  };

  "social.relation.remove": string;
  "social.relation.add": {
    _id: string;
    from: {
      _id: string;
      username: string;
      avatar_revision: string | null;
    };
    to: {
      _id: string;
      username: string;
      avatar_revision: string | null;
    };
  };

  "social.notification": SocialTypes.Notification;

  "social.invite": {
    sender: string;
    roomid: string;
    roomname: string;
    roomname_safe: string;
  };
}
