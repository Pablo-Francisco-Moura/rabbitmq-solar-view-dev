import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.IDC_MYSQL_HOST_PROD || process.env.IDC_MYSQL_HOST,
      port: Number(
        process.env.IDC_MYSQL_PORT_PROD || process.env.IDC_MYSQL_PORT || 3306,
      ),
      user: process.env.IDC_MYSQL_USER_PROD || process.env.IDC_MYSQL_USER,
      password: process.env.IDC_MYSQL_PASS_PROD || process.env.IDC_MYSQL_PASS,
      database: process.env.IDC_MYSQL_DB_PROD || process.env.IDC_MYSQL_DB,
      waitForConnections: true,
      connectionLimit: 5,
      dateStrings: true,
    });
  }
  return pool;
}
