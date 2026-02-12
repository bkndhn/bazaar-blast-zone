import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  title: string | null;
  text_content: string | null;
  image_url: string | null;
  link_url: string | null;
  type: string | null;
  background_color: string | null;
  text_color: string | null;
}

const defaultBanners = [
  {
    id: '1',
    title: 'Welcome to Our Store',
    text_content: 'Discover amazing products at great prices',
    image_url: null,
    link_url: '/products',
    type: 'text',
    background_color: null,
    text_color: null,
  },
];

export function BannerCarousel({ adminId }: { adminId?: string }) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const { data: fetchedBanners, isLoading } = useQuery({
    queryKey: ['active-banners', adminId],
    queryFn: async () => {
      let query = supabase
        .from('banner_ads')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Banner[];
    },
  });

  const banners = (fetchedBanners?.length ? fetchedBanners : defaultBanners) as Banner[];

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent((current - 1 + banners.length) % banners.length);
  const next = () => setCurrent((current + 1) % banners.length);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    setTouchStart(null);
  };

  if (isLoading) {
    return (
      <section className="w-full">
        <Skeleton className="h-[160px] sm:h-[200px] md:h-[280px] lg:h-[340px] w-full" />
      </section>
    );
  }

  return (
    <section 
      className="relative w-full overflow-hidden bg-muted"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <BannerSlide key={banner.id} banner={banner} />
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={prev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={next}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                'h-2 rounded-full transition-all',
                index === current 
                  ? 'w-5 bg-white' 
                  : 'w-2 bg-white/50'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  const isImage = banner.type === 'image' && banner.image_url;
  const bgStyle = banner.background_color ? { backgroundColor: banner.background_color } : undefined;
  const textStyle = banner.text_color ? { color: banner.text_color } : undefined;

  const content = isImage ? (
    <img
      src={banner.image_url!}
      alt={banner.title || 'Banner'}
      className="w-full object-cover h-[160px] sm:h-[200px] md:h-[280px] lg:h-[340px]"
    />
  ) : (
    <div 
      className={cn(
        'flex h-[160px] sm:h-[200px] md:h-[280px] lg:h-[340px] w-full flex-col items-center justify-center px-6 py-8 text-center',
        !banner.background_color && 'bg-gradient-to-r from-primary to-primary/70'
      )}
      style={bgStyle}
    >
      <h2 
        className="text-2xl font-bold drop-shadow-md"
        style={textStyle || { color: 'white' }}
      >
        {banner.title}
      </h2>
      {banner.text_content && (
        <p 
          className="mt-2 text-sm opacity-90"
          style={textStyle || { color: 'white' }}
        >
          {banner.text_content}
        </p>
      )}
    </div>
  );

  if (banner.link_url) {
    const isExternal = banner.link_url.startsWith('http');
    if (isExternal) {
      return (
        <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="min-w-full">
          {content}
        </a>
      );
    }
    return <Link to={banner.link_url} className="min-w-full">{content}</Link>;
  }

  return <div className="min-w-full">{content}</div>;
}
