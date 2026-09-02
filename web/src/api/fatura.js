import { request } from "./request.js";

export const extractFatura = (env, companyId, url) =>
  request("/extract", {
    method: "POST",
    body: JSON.stringify({ env, companyId, url }),
  });
