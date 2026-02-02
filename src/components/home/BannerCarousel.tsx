import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Placeholder banners - in production these would come from database
const banners = [
  {
    id: 1,
    title: 'Big Sale',
    subtitle: 'Up to 70% off on Electronics',
    bgColor: 'bg-gradient-to-r from-primary to-primary/70',
  },
  {
    id: 2,
    title: 'Fashion Week',
    subtitle: 'New arrivals in fashion',
    bgColor: 'bg-gradient-to-r from-accent to-warning',
  },
  {
    id: 3,
    title: 'Free Delivery',
    subtitle: 'On orders above ₹499',
    bgColor: 'bg-gradient-to-r from-success to-success/70',
  },
];

export function BannerCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setCurrent(index);
  };

  const prev = () => {
    setCurrent((current - 1 + banners.length) % banners.length);
  };

  const next = () => {
    setCurrent((current + 1) % banners.length);
  };

  return (
    <section className="relative mx-4 my-4 overflow-hidden rounded-xl">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={cn(
              'flex min-w-full flex-col items-center justify-center px-6 py-12 text-center',
              banner.bgColor
            )}
          >
            <h2 className="text-2xl font-bold text-white drop-shadow-md">
              {banner.title}
            </h2>
            <p className="mt-2 text-sm text-white/90">{banner.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/20 text-white hover:bg-white/30"
        onClick={prev}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-white/20 text-white hover:bg-white/30"
        onClick={next}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              index === current 
                ? 'w-4 bg-white' 
                : 'w-1.5 bg-white/50'
            )}
          />
        ))}
      </div>
    </section>
  );
}
