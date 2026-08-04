export type UserRole = 'CREDIT_MANAGER' | 'CUSTOMER';

export interface AuthSession {
  email: string;
  role: UserRole;
  displayName: string;
}
