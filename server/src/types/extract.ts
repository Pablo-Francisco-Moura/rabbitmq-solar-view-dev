export type ExtractEnv = "local" | "prod";

export interface ExtractRequestBody {
  env?: ExtractEnv;
  url?: unknown;
  companyId?: unknown;
}
