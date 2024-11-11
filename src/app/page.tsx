// src/app/page.tsx
import StockAnalyzer from '@/components/StockAnalyzer';

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <StockAnalyzer />
    </main>
  );
}