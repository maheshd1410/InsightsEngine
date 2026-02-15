export type AppRole = 'admin' | 'engineering_manager' | 'team_lead' | 'executive';

export interface JwtClaims {
  sub: string;
  email: string;
  role: AppRole;
}
