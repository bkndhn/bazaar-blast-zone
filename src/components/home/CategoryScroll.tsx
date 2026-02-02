import { Link } from 'react-router-dom';
import { useCategories, Category } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Default category icons as colored circles if no image
const categoryColors = [
  'bg-primary/20',
  'bg-accent/20', 
  'bg-success/20',
  'bg-warning/20',
  'bg-sale/20',
  'bg-secondary',
];

export function CategoryScroll() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <section className="py-4">
        <div className="flex gap-4 overflow-x-auto px-4 hide-scrollbar">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!categories?.length) {
    return null;
  }

  return (
    <section className="py-4">
      <div className="flex gap-4 overflow-x-auto px-4 hide-scrollbar">
        {categories.map((category, index) => (
          <CategoryItem 
            key={category.id} 
            category={category} 
            colorClass={categoryColors[index % categoryColors.length]}
          />
        ))}
      </div>
    </section>
  );
}

interface CategoryItemProps {
  category: Category;
  colorClass: string;
}

function CategoryItem({ category, colorClass }: CategoryItemProps) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="flex flex-shrink-0 flex-col items-center gap-2"
    >
      <div className={cn(
        'flex h-16 w-16 items-center justify-center overflow-hidden rounded-full',
        category.image_url ? '' : colorClass
      )}>
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-foreground/60">
            {category.name.charAt(0)}
          </span>
        )}
      </div>
      <span className="max-w-16 truncate text-xs font-medium text-foreground">
        {category.name}
      </span>
    </Link>
  );
}
