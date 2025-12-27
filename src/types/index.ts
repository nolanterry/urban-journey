// Type definitions placeholder

export type Tenant = {
  id: string;
  name: string;
  created_at: Date;
};

export type HubspotIntegration = {
  tenant_id: string;
  portal_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: Date | null;
  scopes: string[];
  is_paused: boolean;
  created_at: Date;
  updated_at: Date;
};
