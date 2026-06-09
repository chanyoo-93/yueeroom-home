import EditorialHero from '@/components/home/EditorialHero';
import NewArrivals from '@/components/home/NewArrivals';

export default function HomePage() {
  return (
    // -mx-4 으로 layout의 px-4를 상쇄하고, px-[10%]로 페이지 너비의 10% 여백 적용
    <div className="-mx-4 space-y-8 px-[10%]">
      <EditorialHero />
      <NewArrivals />
    </div>
  );
}
