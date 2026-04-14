import MainBanner from '@/components/home/MainBanner';
import NewArrivals from '@/components/home/NewArrivals';
import CategoryQuickLinks from '@/components/home/CategoryQuickLinks';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <MainBanner />
      <CategoryQuickLinks />
      <NewArrivals />
    </div>
  );
}
