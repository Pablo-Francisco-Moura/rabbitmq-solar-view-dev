import { readFileSync } from "node:fs";
import type { Concessionaria } from "./types/concessionarias.js";

export const concessionarias: Concessionaria[] = JSON.parse(
  readFileSync(new URL("../concessionarias.json", import.meta.url), "utf8"),
);

export const queues: string[] = concessionarias.flatMap((c) => [
  c.queueIn,
  c.queueOut,
]);
