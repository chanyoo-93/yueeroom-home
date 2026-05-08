import AdminSidebar from '@/components/layout/AdminSidebar';
import Providers from '@/components/Providers';
import AdminGuard from './AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminGuard>
        <div className="flex min-h-screen bg-gray-50">
          <AdminSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </AdminGuard>
    </Providers>
  );
}
