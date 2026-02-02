import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionHeaderProps {
  title: string;
  href?: string;
  linkText?: string;
}

export function SectionHeader({ title, href, linkText = 'View All' }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {href && (
        <Link 
          to={href} 
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {linkText}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
