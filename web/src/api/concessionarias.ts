import { request } from "./request.js";
import type { Concessionaria } from "../types/concessionarias.js";

export const getConcessionarias = () =>
  request<Concessionaria[]>("/concessionarias");
