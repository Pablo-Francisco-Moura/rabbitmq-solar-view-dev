import { readFileSync } from "node:fs";

export const concessionarias = JSON.parse(
  readFileSync(new URL("../concessionarias.json", import.meta.url)),
);

export const queues = concessionarias.flatMap((c) => [c.queueIn, c.queueOut]);
