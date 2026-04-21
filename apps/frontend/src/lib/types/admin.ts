export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: string;
  createdAt: string;
  updatedAt: string;
}
