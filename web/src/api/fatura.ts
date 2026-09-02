import { request } from "./request.js";
import type { ExtractEnv, ExtractResult } from "../types/fatura.js";

export const extractFatura = (env: ExtractEnv, companyId: number, url: string) =>
  request<ExtractResult>("/extract", {
    method: "POST",
    body: JSON.stringify({ env, companyId, url }),
  });
