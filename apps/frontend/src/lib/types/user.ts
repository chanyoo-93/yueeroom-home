export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  role: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChildProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  gender: string | null;
  height: number | null;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface CreateChildProfileDto {
  name: string;
  birthDate: string;
}

export interface UpdateChildProfileDto {
  name?: string;
  birthDate?: string;
}

export interface CreateAddressDto {
  name: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  name?: string;
  recipient?: string;
  phone?: string;
  zipCode?: string;
  address1?: string;
  address2?: string;
  isDefault?: boolean;
}
