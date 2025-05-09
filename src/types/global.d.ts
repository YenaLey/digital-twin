declare module "forge-apis";

declare interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  client_id: string;
  client_secret: string;
  callbackURL: string;
  scope: string[];
}

declare interface Creds {
  client_id: string;
  client_secret: string;
}

declare interface Token {
  access_token: string;
  expires_in: number;
}
