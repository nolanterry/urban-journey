/**
 * HubSpot API types
 */

export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface HubSpotProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  options?: Array<{ label: string; value: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotPropertiesResponse {
  results: HubSpotProperty[];
}

export interface HubSpotPipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata?: Record<string, unknown>;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  archived: boolean;
  stages: HubSpotPipelineStage[];
}

export interface HubSpotPipelinesResponse {
  results: HubSpotPipeline[];
}

export interface HubSpotDeal {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface HubSpotDealsResponse {
  results: HubSpotDeal[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

export interface HubSpotError {
  status: string;
  message: string;
  category: string;
}
