import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminGetProducts,
  adminGetProductDetail,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminCreateVariant,
  adminDeleteVariant,
  adminUploadImage,
  adminDeleteImage,
} from '../api/admin-products';
import type {
  CreateProductPayload,
  UpdateProductPayload,
  CreateVariantPayload,
} from '../api/admin-products';
import { queryKeys } from '../api/query-keys';

export function useAdminProducts(page = 1) {
  return useQuery({
    queryKey: queryKeys.admin.products(page),
    queryFn: () => adminGetProducts(page),
  });
}

export function useAdminProductDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.admin.productDetail(id),
    queryFn: () => adminGetProductDetail(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => adminCreateProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      adminUpdateProduct(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: CreateVariantPayload }) =>
      adminCreateVariant(productId, payload),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productDetail(productId) });
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      adminDeleteVariant(productId, variantId),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productDetail(productId) });
    },
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) =>
      adminUploadImage(productId, file),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productDetail(productId) });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      adminDeleteImage(productId, imageId),
    onSuccess: (_data, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.productDetail(productId) });
    },
  });
}
