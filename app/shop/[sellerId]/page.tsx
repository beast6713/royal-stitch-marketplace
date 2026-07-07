import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, BadgeCheck, Store, Star } from "lucide-react";
import { getMarketplaceProducts } from "@/lib/products";
import { getSellerProfile } from "@/lib/mock-data";
import { ProductCard } from "@/components/product-card";
import { FadeInSection, StaggerContainer, StaggerItem } from "@/components/framer-wrappers";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = await params;
  
  const { products } = await getMarketplaceProducts({
    query: "",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  
  const sellerProducts = products.filter(p => p.sellerId === sellerId);
  const profile = getSellerProfile(sellerId);
  
  // Calculate aggregate mock stats
  const totalReviews = sellerProducts.reduce((acc, p) => acc + (p.reviewCount ?? 0), 0);
  const averageRating = totalReviews > 0 
    ? (sellerProducts.reduce((acc, p) => acc + (p.averageRating ?? 4.8), 0) / sellerProducts.length).toFixed(1)
    : "4.9";
  
  return (
    <main className="min-h-screen bg-parchment pb-24">
      {/* Cover Header */}
      <div className="relative h-64 bg-royal md:h-80 w-full overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1606722590583-6951b5ea92a2?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
        <div className="absolute inset-x-0 top-0 p-6 z-10 flex">
           <Link href="/categories" className="inline-flex h-10 items-center justify-center rounded-full bg-white/20 px-4 backdrop-blur-md text-white hover:bg-white/40 transition gap-2 text-sm font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Back to market
           </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 -mt-20 relative z-20">
        <FadeInSection>
          <div className="rounded-[32px] bg-white/80 backdrop-blur-xl border border-white/20 p-8 shadow-[0_30px_60px_rgba(16,37,66,0.1)] md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0">
                <div className="relative h-32 w-32 md:h-40 md:w-40 overflow-hidden rounded-[24px] border-4 border-white shadow-md bg-royal/5">
                  <Image src={profile.profileImage} alt={profile.shopName} fill className="object-cover" />
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl md:text-5xl text-royal">{profile.shopName}</h1>
                  {profile.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pine/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pine mt-2 md:mt-0">
                      <BadgeCheck className="h-4 w-4" />
                      Verified Maker
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold mt-2 md:mt-0">
                      Under Review
                    </span>
                  )}
                </div>
                
                <p className="text-lg font-medium text-royal/60 flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Operated by {profile.sellerName}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-royal/80 pb-4 border-b border-royal/10">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gold" />
                    {profile.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-gold fill-current" />
                    {averageRating} ({totalReviews} reviews)
                  </span>
                  <span>
                    <strong>{sellerProducts.length}</strong> products
                  </span>
                </div>
                
                <p className="text-base text-royal/80 leading-relaxed max-w-3xl pt-2">
                  {profile.bio}
                </p>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.tags.map(tag => (
                    <span key={tag} className="rounded-full bg-royal/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-royal/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        <div className="mt-16 md:mt-24">
          <StaggerContainer className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <StaggerItem>
              <h2 className="font-display text-4xl tracking-tight text-royal">
                Collection by {profile.shopName}
              </h2>
            </StaggerItem>
          </StaggerContainer>

          {sellerProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellerProducts.map((product, i) => (
                <ProductCard key={product.id} product={product} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="rounded-[32px] bg-white/40 p-12 text-center shadow-inner mt-8">
              <Store className="h-12 w-12 text-royal/20 mx-auto mb-4" />
              <p className="font-display text-2xl text-royal/40">This artisan has no active listings.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
