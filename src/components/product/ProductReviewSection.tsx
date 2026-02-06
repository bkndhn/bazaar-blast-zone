import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductReviews, useProductRating, useCanReviewProduct, useCreateProductReview } from '@/hooks/useProductReviews';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ProductReviewSectionProps {
  productId: string;
  adminId: string;
}

export function ProductReviewSection({ productId, adminId }: ProductReviewSectionProps) {
  const { user } = useAuth();
  const { data: reviews, isLoading: reviewsLoading } = useProductReviews(productId);
  const { data: rating, isLoading: ratingLoading } = useProductRating(productId);
  const { data: canReviewData } = useCanReviewProduct(productId);
  const createReview = useCreateProductReview();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const handleSubmitReview = async () => {
    if (!canReviewData?.deliveredOrderId) return;

    await createReview.mutateAsync({
      productId,
      orderId: canReviewData.deliveredOrderId,
      rating: reviewRating,
      reviewText,
      adminId,
    });

    setReviewOpen(false);
    setReviewRating(5);
    setReviewText('');
  };

  if (ratingLoading) {
    return (
      <div className="mt-6">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Rating Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded bg-success px-2 py-0.5">
            <span className="text-sm font-semibold text-success-foreground">
              {rating?.average || 0}
            </span>
            <Star className="h-3.5 w-3.5 fill-success-foreground text-success-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">
            {rating?.count || 0} Ratings
          </span>
        </div>

        {/* Write Review Button */}
        {user && canReviewData?.canReview && (
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
            Write Review
          </Button>
        )}
      </div>

      {canReviewData?.alreadyReviewed && (
        <p className="mt-2 text-xs text-muted-foreground">
          You have already reviewed this product
        </p>
      )}

      {/* Reviews List */}
      {reviewsLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.slice(0, 5).map((review) => (
            <div key={review.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-3 w-3',
                        star <= review.rating
                          ? 'fill-rating text-rating'
                          : 'text-muted-foreground'
                      )}
                    />
                  ))}
                </div>
                {review.is_verified_purchase && (
                  <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded">
                    Verified Purchase
                  </span>
                )}
              </div>
              {review.review_text && (
                <p className="mt-2 text-sm text-foreground/90">{review.review_text}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet</p>
      )}

      {/* Write Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= reviewRating ? 'fill-rating text-rating' : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-text">Review (optional)</Label>
              <Textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={createReview.isPending}>
              {createReview.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
