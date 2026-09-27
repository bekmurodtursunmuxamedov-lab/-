export type IntegrationState = {
  configured?: boolean;
  connected?: boolean;
  error?: string;
};

export declare function integrationLabel(state: IntegrationState): string;
