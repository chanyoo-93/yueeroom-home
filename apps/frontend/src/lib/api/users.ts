import apiClient from './client';
import type {
  UserProfile,
  ChildProfile,
  Address,
  UpdateProfileDto,
  ChangePasswordDto,
  CreateChildProfileDto,
  UpdateChildProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
} from '../types/user';

export async function getMe(): Promise<UserProfile> {
  const res = await apiClient.get<UserProfile>('/users/me');
  return res.data;
}

export async function updateProfile(dto: UpdateProfileDto): Promise<UserProfile> {
  const res = await apiClient.patch<UserProfile>('/users/me', dto);
  return res.data;
}

export async function changePassword(dto: ChangePasswordDto): Promise<void> {
  await apiClient.patch('/users/me/password', dto);
}

export async function getChildren(): Promise<ChildProfile[]> {
  const res = await apiClient.get<ChildProfile[]>('/users/me/children');
  return res.data;
}

export async function addChild(dto: CreateChildProfileDto): Promise<ChildProfile> {
  const res = await apiClient.post<ChildProfile>('/users/me/children', dto);
  return res.data;
}

export async function updateChild(
  childId: string,
  dto: UpdateChildProfileDto,
): Promise<ChildProfile> {
  const res = await apiClient.patch<ChildProfile>(`/users/me/children/${childId}`, dto);
  return res.data;
}

export async function deleteChild(childId: string): Promise<void> {
  await apiClient.delete(`/users/me/children/${childId}`);
}

export async function getAddresses(): Promise<Address[]> {
  const res = await apiClient.get<Address[]>('/users/me/addresses');
  return res.data;
}

export async function addAddress(dto: CreateAddressDto): Promise<Address> {
  const res = await apiClient.post<Address>('/users/me/addresses', dto);
  return res.data;
}

export async function updateAddress(addressId: string, dto: UpdateAddressDto): Promise<Address> {
  const res = await apiClient.patch<Address>(`/users/me/addresses/${addressId}`, dto);
  return res.data;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete(`/users/me/addresses/${addressId}`);
}
