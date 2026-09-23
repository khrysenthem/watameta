import type { ColumnType, Generated } from "kysely";

export interface UsersTable {
  id: Generated<string>;
  email: string;
}

export interface ReadingsTable {
  user_id: string;
  recorded_at: ColumnType<Date, Date | string, Date | string>;
  value: number;
}

export interface Database {
  users: UsersTable;
  readings: ReadingsTable;
}
