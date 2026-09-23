export interface UsersTable {
  id: string;
  email: string;
}

export interface Database {
  users: UsersTable;
}
