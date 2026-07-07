import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react";
import { EngagementControls } from "@/components/engagement-controls";
import { ProductCard } from "@/components/product-card";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { ReviewForm } from "@/components/review-form";
import { TelemetryView } from "@/components/telemetry-view";
import { WhatsAppShareButton } from "@/components/whatsapp-share-button";
import {
  FadeInSection,
  StaggerContainer,
  StaggerItem
} from "@/components/framer-wrappers";
import { ProductGallery } from "@/components/product-gallery";
import { getStoredEngagementSnapshot } from "@/lib/engagement-store";
import {
  buildSellerOperationsSnapshot,
  findProductById,
  getProductPriceHistory,
  getSimilarProducts
} from "@/lib/marketplace-intelligence";
import { getProductDiscountPercent } from "@/lib/product-core";
import { getMarketplaceProducts } from "@/lib/products";
import { getProductReviews } from "@/lib/reviews";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { getViewerIdentity } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { products, sourceState, errorMessage } = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  const product = findProductById(products, productId);

  if (!product) {
    notFound();
  }

  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const engagement = await getStoredEngagementSnapshot(viewer.buyerId, cookieStore);
  const similarProducts = getSimilarProducts(products, product, 4);
  const sellerSnapshot = buildSellerOperationsSnapshot(product.sellerId, [product]);
  const priceHistory = getProductPriceHistory(product.id);
  const { reviews, summary } = await getProductReviews(product.id);
  const maxPrice = Math.max(
    product.compareAtPrice ?? product.price,
    ...priceHistory.map((entry) => entry.price)
  );
  const discountPercent = getProductDiscountPercent(product.price, product.compareAtPrice);

  return (
    <main className="min-h-screen bg-parchment pb-20">
      <TelemetryView
        event="product.viewed"
        page={`/products/${product.id}`}
        productId={product.id}
        sellerId={product.sellerId}
        properties={{
          category: product.category,
          price: product.price
        }}
      />
      <div className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:p-8">
        
        {/* LEFT PILLAR - STICKY IMAGE */}
        <div className="relative h-[60vh] lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
           <FadeInSection className="h-full w-full">
            <div className="relative h-full w-full overflow-hidden lg:rounded-[32px] shadow-royal">
              <ProductGallery
                images={[product.imageUrl, ...(product.additionalImageUrls || [])]}
                alt={product.name}
              />
              
              {/* Glassmorphic Top Bar Floating Overlay */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6 z-10 bg-gradient-to-b from-royal/50 to-transparent">
                <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex rounded-full backdrop-blur-md bg-white/80 border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-royal shadow-royal">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                    Verified Handmade
                  </span>
                  {discountPercent ? (
                    <span className="inline-flex rounded-full backdrop-blur-md bg-gold/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-royal">
                      {discountPercent}% Exclusivity
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
           </FadeInSection>
        </div>

        {/* RIGHT PILLAR - SCROLLING CONTENT */}
        <div className="px-6 py-10 sm:px-12 lg:px-6 lg:py-12">
          {sourceState !== "database" ? (
            <div className="mb-8 rounded-[24px] border border-gold/20 bg-gold/10 p-5 text-sm text-royal">
              {errorMessage ??
                "The catalog is using degraded data right now, so live seller signals may be limited."}
            </div>
          ) : null}

          <StaggerContainer>
            <StaggerItem>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
                <Link href="/" className="hover:text-royal transition">Home</Link>
                <span>/</span>
                <Link href={`/?category=${encodeURIComponent(product.category)}`} className="hover:text-royal transition">{product.category}</Link>
                <span>/</span>
                <span>{product.material}</span>
                <span>&bull;</span>
                <Link href={`/shop/${product.sellerId}`} className="hover:text-gold transition font-bold text-royal underline">
                  By {product.sellerName}
                </Link>
              </div>
            </StaggerItem>

            <StaggerItem>
              <h1 className="mt-4 font-display text-5xl tracking-tight text-royal sm:text-7xl">
                {product.name}
              </h1>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 flex flex-wrap items-end gap-4 border-b border-royal/10 pb-8">
                <div>
                  {product.compareAtPrice ? (
                    <p className="text-xl text-royal/40 line-through">
                      {formatCurrency(product.compareAtPrice)}
                    </p>
                  ) : null}
                  <p className="font-display text-4xl text-royal">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-5 w-5 fill-current text-gold" />
                  <span className="font-bold text-royal text-sm">
                    {(summary.averageRating || product.averageRating || 4.8).toFixed(1)}
                  </span>
                  <span className="text-sm text-royal/60">({summary.totalReviews || product.reviewCount || 0} reviews)</span>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-8 text-lg font-sans leading-relaxed text-royal/80">
                {product.description}
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 grid gap-4 grid-cols-2">
                <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white/20 p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pine">
                    {product.status === "out_of_stock" || product.stockQuantity === 0
                      ? "Made to order"
                      : "Ready to ship"}
                  </p>
                  <p className="mt-2 text-sm text-royal font-medium">
                    {product.status === "out_of_stock" || product.stockQuantity === 0
                      ? "Ships in 7-10 days."
                      : product.status === "low_stock" || (product.stockQuantity && product.stockQuantity <= 3)
                        ? `Only ${product.stockQuantity} piece(s) available.`
                        : `${product.stockQuantity ?? 0} pieces ready.`}
                  </p>
                </div>
                
                <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white/20 p-5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
                    Handmade Details
                  </p>
                  <p className="mt-2 text-sm text-royal font-medium">
                    Material: {product.material}<br/>
                    Time to make: {product.status === "out_of_stock" || product.stockQuantity === 0 ? "3-5 days" : "Ready to dispatch"}
                  </p>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8">
                <ProductPurchasePanel product={product} />
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-6 flex flex-wrap gap-4">
                <EngagementControls
                  productId={product.id}
                  productName={product.name}
                  page={`/products/${product.id}`}
                />
                <WhatsAppShareButton
                  productName={product.name}
                  productPath={`/products/${product.id}`}
                />
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-12 rounded-[32px] backdrop-blur-xl bg-white/60 border border-white/20 p-8 shadow-royal">
                <div className="flex items-center gap-3 text-royal mb-6">
                  <ShieldCheck className="h-6 w-6 text-gold" />
                  <h3 className="font-display text-2xl tracking-tight">The Atelier Assurance</h3>
                </div>
                <ul className="space-y-4 text-sm text-royal/80">
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-royal/40" />
                    Shipped securely with tracking directly from the artisan&apos;s studio.
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-royal/40" />
                    7-day easy returns if the fit or finish isn&apos;t to your standard.
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-royal/40" />
                    Next anticipated restock: Not guaranteed for bespoke batches.
                  </li>
                </ul>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </div>

      {/* BOTTOM SECTION: REVIEWS & SIMILAR */}
      <div className="mx-auto max-w-[1200px] px-6 mt-12 lg:mt-24 space-y-24">
        
        <FadeInSection>
          <div className="text-center">
            <div className="inline-flex rounded-full bg-champagne/50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-royal mb-4">
              Artisan Reception
            </div>
            <h2 className="font-display text-4xl text-royal md:text-5xl">Reviews & Feedback</h2>
          </div>
          
          <div className="mt-12 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
               <ReviewForm
                  productId={product.id}
                  productName={product.name}
                  signedIn={viewer.isAuthenticated}
                />
            </div>
            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-[32px] backdrop-blur-xl bg-white/60 border border-white/20 p-8 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-royal/10 pb-4">
                      <div>
                        <p className="font-display text-2xl text-royal">{review.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.1em] text-royal/50">{review.buyerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                          {review.rating.toFixed(1)}
                        </p>
                        {review.verifiedPurchase ? (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-pine">
                            Verified Collection
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-6 text-base leading-relaxed text-royal/80">{review.body}</p>
                    {review.sizeInsight ? (
                      <p className="mt-4 inline-flex rounded-full bg-royal/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-royal/60">
                        Fit insight: {review.sizeInsight}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[32px] bg-white/40 p-12 text-center shadow-inner">
                  <p className="font-display text-2xl text-royal/40">Be the first to review this piece.</p>
                </div>
              )}
            </div>
          </div>
        </FadeInSection>

        <FadeInSection>
          <div className="flex flex-col items-center text-center">
            <h2 className="font-display text-4xl text-royal md:text-5xl">Curated Alternatives</h2>
            <p className="mt-4 text-royal/60 max-w-lg">
              Explore similar silhouettes, complementary materials, and pieces from the same collection.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similarProducts.map((similarProduct, index) => (
              <ProductCard
                key={similarProduct.id}
                product={similarProduct}
                priority={index === 0}
              />
            ))}
          </div>
        </FadeInSection>

      </div>
    </main>
  );
}
