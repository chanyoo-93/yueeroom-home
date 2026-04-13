import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-screen-xl px-4 py-4 pb-20 md:pb-4">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
