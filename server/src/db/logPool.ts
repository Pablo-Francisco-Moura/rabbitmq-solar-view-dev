import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let pool: Pool | undefined;

// Base "integracao_digital_log" — separada do banco IDC (pool.ts), guarda o
// historico de requisicoes dos robos de integracao com os portais.
export function getLogPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_INTEGRACAO_DIGITAL_LOG_HOST,
      port: Number(process.env.DB_INTEGRACAO_DIGITAL_LOG_PORT || 3306),
      user: process.env.DB_INTEGRACAO_DIGITAL_LOG_USERNAME,
      password: process.env.DB_INTEGRACAO_DIGITAL_LOG_PASSWORD,
      database: process.env.DB_INTEGRACAO_DIGITAL_LOG_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      dateStrings: true,
    });
  }
  return pool;
}
