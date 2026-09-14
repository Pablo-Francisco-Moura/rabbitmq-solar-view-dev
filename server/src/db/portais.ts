import { getPool } from "./pool.js";
import type { PortalRow } from "../types/portais.js";

export async function getPortais(): Promise<PortalRow[]> {
  const db = getPool();
  const [rows] = await db.query<PortalRow[]>(
    `SELECT * FROM portal ORDER BY portalNome ASC`,
  );
  return rows;
}
