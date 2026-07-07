import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Brush,
  Crown,
  Database,
  Flame,
  Heart,
  ShieldCheck,
  Star,
  Store,
  Truck
} from "lucide-react";
import { HomeFilterBar } from "@/components/home-filter-bar";
import { LocalMarketplaceProducts } from "@/components/local-marketplace-products-client";
import { ProductsList } from "@/components/ProductsList";
import { ProductCard } from "@/components/product-card";
import { Suspense } from "react";
import { CATEGORY_OPTIONS, MARKETPLACE_NAME } from "@/lib/constants";
import { readExperimentAssignments } from "@/lib/experiments";
import { getStoredEngagementSnapshot } from "@/lib/engagement-store";
import { mockProductReviews } from "@/lib/mock-data";
import { normalizeProductFilters, type SearchParamsRecord } from "@/lib/product-core";
import { getMarketplaceProducts } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import { getViewerIdentity } from "@/lib/viewer";
import { rankProductsForVariant } from "@/lib/marketplace-intelligence";
import type { ProductFilters, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const whyUsItems = [
  {
    title: "100% Handmade",
    description: "No factory products. Every piece is crafted by real artisans, one stitch at a time.",
    icon: BadgeCheck
  },
  {
    title: "Unique Designs",
    description: "Original patterns, thoughtful details, and small-batch drops make each find feel personal.",
    icon: Brush
  },
  {
    title: "Support Creators",
    description: "Every order helps independent makers grow their craft into a thriving small business.",
    icon: Store
  },
  {
    title: "Safe Delivery",
    description: "Reliable shipping, easy returns, and a seamless checkout experience from browse to doorstep.",
    icon: Truck
  }
] as const;

const socialProofStats = [
  { label: "Average rating", value: "4.8/5" },
  { label: "Happy buyers", value: "2,000+" },
  { label: "Repeat purchase love", value: "92%" }
] as const;

const footerGroups = [
  {
    title: "About",
    links: [
      { href: "/", label: "Our story" },
      { href: "/categories", label: "Browse categories" }
    ]
  },
  {
    title: "Contact",
    links: [
      { href: "mailto:hello@royalstitchmarket.com", label: "hello@royalstitchmarket.com" },
      { href: "tel:+919900000000", label: "+91 99000 00000" }
    ]
  },
  {
    title: "Returns Policy",
    links: [
      { href: "/orders", label: "Easy returns" },
      { href: "/orders", label: "Buyer protection" }
    ]
  },
  {
    title: "Social Links",
    links: [
      { href: "https://instagram.com", label: "Instagram" },
      { href: "https://pinterest.com", label: "Pinterest" }
    ]
  },
  {
    title: "Seller Info",
    links: [
      { href: "/seller", label: "Start selling" },
      { href: "/seller", label: "Creator dashboard" }
    ]
  }
] as const;

function buildFilterHref(
  currentFilters: ProductFilters,
  nextValues: Partial<
    Pick<ProductFilters, "query" | "material" | "category" | "priceRange" | "rating">
  >
) {
  const params = new URLSearchParams();
  const nextQuery = nextValues.query ?? currentFilters.query;
  const nextMaterial = nextValues.material ?? currentFilters.material;
  const nextCategory = nextValues.category ?? currentFilters.category;
  const nextPriceRange = nextValues.priceRange ?? currentFilters.priceRange;
  const nextRating = nextValues.rating ?? currentFilters.rating;

  if (nextQuery) {
    params.set("query", nextQuery);
  }

  if (nextMaterial) {
    params.set("material", nextMaterial);
  }

  if (nextCategory) {
    params.set("category", nextCategory);
  }

  if (nextPriceRange) {
    params.set("price", nextPriceRange);
  }

  if (nextRating) {
    params.set("rating", nextRating);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

function getSourceHeading(sourceState: "database" | "demo" | "unconfigured" | "error") {
  if (sourceState === "demo") {
    return "A curated preview is live";
  }

  if (sourceState === "unconfigured") {
    return "Fresh handmade pieces are on the way";
  }

  return "The collection is taking a little longer to load";
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = normalizeProductFilters(resolvedSearchParams);
  const cookieStore = await cookies();
  const viewer = await getViewerIdentity(cookieStore);
  const engagement = await getStoredEngagementSnapshot(viewer.buyerId, cookieStore);
  const experiments = readExperimentAssignments(cookieStore);
  const { products, sourceState, errorMessage } = await getMarketplaceProducts(filters);
  const rankedProducts = rankProductsForVariant(products, experiments.searchRanking);
  const heroProduct = rankedProducts[0] ?? null;
  const featuredProduct =
    rankedProducts.find((product) => product.name === "Velvet Bloom Cardigan") ??
    rankedProducts[1] ??
    heroProduct;
  const trendingProducts = [...rankedProducts]
    .sort((left, right) => (right.unitsSoldToday ?? 0) - (left.unitsSoldToday ?? 0))
    .slice(0, 8);
  const categoryCards = [
    {
      title: "Sweaters",
      subtitle: "Cozy handmade layers for cool mornings and festive evenings.",
      href: buildFilterHref(filters, { category: "Sweaters" }),
      image:
        rankedProducts.find((product) => product.category === "Sweaters")?.imageUrl ??
        heroProduct?.imageUrl ??
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=80"
    },
    {
      title: "Plush Toys",
      subtitle: "Soft crochet companions made to delight little shelves and gift boxes.",
      href: buildFilterHref(filters, { category: "Amigurumi" }),
      image:
        rankedProducts.find((product) => product.category === "Amigurumi")?.imageUrl ??
        heroProduct?.imageUrl ??
        "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&w=1200&q=80"
    },
    {
      title: "Scarves",
      subtitle: "Texture-rich wraps, soft yarns, and everyday warmth in one lane.",
      href: buildFilterHref(filters, { query: "scarf" }),
      image:
        rankedProducts.find((product) => product.material === "Wool")?.imageUrl ??
        heroProduct?.imageUrl ??
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
    },
    {
      title: "Home Decor",
      subtitle: "Blankets, accents, and cozy handmade pieces for softening every corner.",
      href: buildFilterHref(filters, { category: "Blankets" }),
      image:
        rankedProducts.find((product) => product.category === "Blankets")?.imageUrl ??
        heroProduct?.imageUrl ??
        "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80"
    },
    {
      title: "Custom Orders",
      subtitle: "Work with artisans to create a piece that feels made just for you.",
      href: "/seller",
      image:
        heroProduct?.imageUrl ??
        "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&w=1200&q=80"
    }
  ];
  const productById = new Map(rankedProducts.map((product) => [product.id, product]));
  const testimonials = mockProductReviews.slice(0, 3).map((review) => ({
    ...review,
    product: productById.get(review.productId) ?? heroProduct
  }));
  const hasActiveFilters = Boolean(
    filters.query || filters.material || filters.category || filters.priceRange || filters.rating
  );
  const visibleProducts =
    (hasActiveFilters ? rankedProducts : trendingProducts).length > 0
      ? (hasActiveFilters ? rankedProducts : trendingProducts).slice(0, 8)
      : rankedProducts.slice(0, 8);
  const personalizedCount = new Set([
    ...engagement.wishlistIds,
    ...engagement.savedForLaterIds,
    ...engagement.recentlyViewedIds
  ]).size;

  return (
    <main className="pb-24 lg:pb-12">

      <section className="shell pt-6 sm:pt-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="panel overflow-hidden px-6 py-10 sm:px-12 sm:py-16 bg-white/60">
            <div className="tag">
              <Crown className="h-3.5 w-3.5" />
              Royal Stitch Atelier
            </div>

            <h1 className="mt-8 max-w-3xl font-display text-5xl tracking-tight leading-[0.95] text-royal sm:text-7xl">
              Handmade Crochet &amp; Knits, Crafted with Love
            </h1>
            <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-royal/80 sm:text-lg">
              Discover one-of-a-kind handmade pieces created by passionate artisans. From cozy
              wearables to unique gifts, every stitch tells a story.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="#collection" className="button-primary">
                Explore Collection
              </Link>
              <Link href="/reels" className="button-secondary">
                <Flame className="w-4 h-4" /> Discover Reels
              </Link>
              <Link
                href="/seller"
                className="button-secondary"
              >
                Start Selling
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-4 font-body text-sm font-semibold tracking-wide text-royal/60">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold" />
                100% Handmade
              </span>
              <span className="inline-flex items-center gap-2">
                <Brush className="h-4 w-4 text-gold" />
                Unique Designs
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-gold" />
                Fast Delivery
              </span>
            </div>

            <div className="mt-10 rounded-[22px] border border-white/20 bg-white/40 p-5 font-body text-sm font-semibold text-royal/80 shadow-sm">
              <div className="flex flex-wrap items-center gap-5">
                <span className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 fill-current text-gold" />
                  4.8/5 from 2,000+ buyers
                </span>
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gold" />
                  Fast Delivery
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  Secure Checkout
                </span>
              </div>
            </div>
          </div>

          <div className="panel overflow-hidden p-3">
            {heroProduct ? (
              <div className="relative aspect-[4/4.5] overflow-hidden rounded-[22px] bg-[#ede3d7]">
                <Image
                  src={heroProduct.imageUrl}
                  alt={heroProduct.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102542]/72 via-[#102542]/12 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/20 bg-white/80 p-6 shadow-royal backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/10 bg-gold/10 px-3 py-1 text-gold">
                      <Flame className="h-3 w-3" />
                      Trending today
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-royal/10 bg-royal/5 px-3 py-1 text-royal">
                      <Star className="h-3 w-3 fill-current text-gold" />
                      {(heroProduct.averageRating ?? 4.8).toFixed(1)} rating
                    </span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-4xl text-royal">{heroProduct.name}</h2>
                      <p className="mt-2 font-body text-sm leading-6 text-royal/70">
                        {heroProduct.trendLabel ?? "A warm artisan-made favorite for gifting or keeping."}
                      </p>
                    </div>
                    <p className="font-display text-3xl font-semibold text-royal">
                      {formatCurrency(heroProduct.price)}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                    <span className="rounded-full border border-royal/10 bg-white/60 backdrop-blur px-4 py-2 font-body font-semibold text-pine shadow-sm">
                      {heroProduct.status === "out_of_stock"
                        ? "Back soon"
                        : `Only ${Math.max(heroProduct.stockQuantity ?? 1, 1)} left`}
                    </span>
                    <Link href={`/products/${heroProduct.id}`} className="inline-flex items-center gap-2 font-body font-semibold text-royal transition hover:text-gold">
                      View details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center rounded-[22px] bg-[#fbf7f2] p-6 text-center text-slate-600">
                Fresh handmade arrivals will appear here as soon as the collection is ready.
              </div>
            )}
          </div>
        </div>
      </section>

      {sourceState !== "database" ? (
        <section className="shell pt-6">
          <div
            className={`rounded-[24px] border p-5 text-sm ${
              sourceState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-[#eadfce] bg-[#fbf7f2] text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-royal">
              {sourceState === "error" ? (
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {getSourceHeading(sourceState)}
            </div>
            <p className="mt-2">
              {errorMessage ??
                "Please try again in a little while while we refresh more products from our artisan community."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="shell pt-16">
        <div className="text-center">
          <div className="tag">Why shoppers stay</div>
          <h2 className="mt-6 font-display text-4xl tracking-tight text-royal sm:text-6xl">Why Choose Us?</h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {whyUsItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="panel p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-royal/5 text-royal">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="mt-6 font-display text-3xl text-royal">{item.title}</h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-royal/70">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="collection" className="shell pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="tag">
              <Flame className="h-3.5 w-3.5" />
              Handmade favorites
            </div>
            <h2 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Trending Crochet Picks</h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-royal/70">
              {hasActiveFilters
                ? "Here are the handmade pieces that match your style best, without the clutter."
                : "High-demand crochet and knit pieces chosen for their warmth, craftsmanship, and shopper love."}
            </p>
          </div>
          <div className="rounded-full border border-white/20 bg-white/80 backdrop-blur px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-royal shadow-sm">
            {visibleProducts.length > 0
              ? `${visibleProducts.length} beautiful finds to explore`
              : "Fresh favorites coming soon"}
          </div>
        </div>

        <div className="mt-8">
          <Suspense fallback={<div>Loading filters...</div>}>
            <HomeFilterBar filters={filters} resultCount={rankedProducts.length} />
          </Suspense>
        </div>

        <Suspense fallback={<div>Loading products...</div>}>
          <ProductsList initialProducts={rankedProducts} />
        </Suspense>
      </section>

      <LocalMarketplaceProducts />

      <section className="shell pt-16">
        <div className="text-center">
          <div className="tag">Explore the shop</div>
          <h2 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Shop by Category</h2>
        </div>

        <div className="-mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-5">
          {categoryCards.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group relative min-w-[240px] overflow-hidden rounded-[24px] border border-[#eadfce] bg-white shadow-[0_18px_45px_rgba(74,49,24,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_55px_rgba(74,49,24,0.14)] md:min-w-0"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  sizes="(max-width: 1280px) 50vw, 20vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#102542]/86 via-[#102542]/22 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-[22px] backdrop-blur-xl bg-white/20 border border-white/20 p-5 shadow-royal">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-champagne">
                    Curated lane
                  </p>
                  <h3 className="mt-3 font-display text-4xl text-white">{category.title}</h3>
                  <p className="mt-2 font-body text-sm leading-6 text-white/80">{category.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell pt-16">
        <div className="text-center">
          <div className="tag">
            <Heart className="h-3.5 w-3.5" />
            Social proof
          </div>
          <h2 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">Loved by Our Customers</h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {socialProofStats.map((stat) => (
            <div key={stat.label} className="panel p-8 text-center transition duration-500 hover:scale-[1.03]">
              <p className="font-display text-5xl text-royal">{stat.value}</p>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-royal/60">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="-mx-4 mt-8 flex gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
          {testimonials.map((review) => (
            <div key={review.id} className="panel min-w-[300px] p-6 lg:min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1 text-gold">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={`${review.id}-${index}`} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                {review.product ? (
                  <div className="relative h-14 w-14 overflow-hidden rounded-[18px]">
                    <Image
                      src={review.product.imageUrl}
                      alt={review.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </div>

              <p className="mt-5 text-2xl leading-snug text-royal">&ldquo;{review.body}&rdquo;</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7efe5] text-sm font-semibold text-royal">
                  {review.buyerName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-royal">{review.buyerName}</p>
                  <p className="text-sm text-slate-600">
                    {review.title}
                    {review.product ? ` \u2022 ${review.product.name}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {featuredProduct ? (
        <section className="shell pt-16">
          <div className="panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[0.92fr,1.08fr]">
              <div className="relative min-h-[20rem] bg-[#eadfce]">
                <Image
                  src={featuredProduct.imageUrl}
                  alt={featuredProduct.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
                <div className="tag">
                  <Crown className="h-3.5 w-3.5" />
                  Featured today
                </div>
                <h2 className="mt-6 font-display text-5xl tracking-tight text-royal sm:text-6xl">
                  {featuredProduct.name}
                </h2>
                <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-royal/70">
                  Soft yarns, handcrafted finish, and the kind of detail that turns an everyday pick into something memorable.
                </p>
                <p className="mt-6 font-display text-4xl font-semibold text-royal">
                  {formatCurrency(featuredProduct.price)}
                </p>

                <div className="mt-8 flex flex-wrap gap-4 font-body text-sm font-semibold tracking-wide text-royal/60">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    Secure checkout
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" />
                    Fast delivery
                  </span>
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link href={`/products/${featuredProduct.id}`} className="button-primary">
                    Buy Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/wishlist" className="button-secondary">
                    Save for later
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="shell py-16">
        <div className="rounded-3xl border border-white/20 bg-royal px-6 py-12 sm:px-12 sm:py-16 shadow-royal text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-champagne/30 bg-champagne/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-champagne backdrop-blur-md">
              <Store className="h-4 w-4" />
              Seller Studio
            </div>
            <h2 className="mt-8 font-display text-5xl tracking-tight text-white sm:text-6xl">Turn Your Craft Into Income</h2>
            <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-champagne/80 sm:text-lg">
              Join our community of yarn artisans and start selling your handcrafted crochet or knit pieces today. Reach shoppers who value authentic craftsmanship.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-6 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-champagne/60">
              <span className="inline-flex items-center gap-2">
                Upload in minutes
              </span>
              <span className="inline-flex items-center gap-2">
                Easy shopping experience
              </span>
              <span className="inline-flex items-center gap-2">
                Seamless checkout
              </span>
            </div>
            
            <div className="mt-10">
              <Link href="/seller" className="inline-flex items-center justify-center gap-2 rounded-full bg-champagne px-8 py-4 font-display text-lg tracking-wide text-royal shadow-glow transition duration-500 hover:scale-[1.03] hover:bg-white">
                Start Selling Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-royal py-12 text-white">
        <div className="shell">
          <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr,1fr,1fr,1fr,1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-white/10 text-champagne">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-champagne/80">
                    Handmade marketplace
                  </p>
                  <p className="text-2xl text-white">{MARKETPLACE_NAME}</p>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/72">
                Discover artisan crochet and knitting pieces made with warmth, care, and character.
              </p>
            </div>

            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg text-white">{group.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-white/72">
                  {group.links.map((link) => {
                    const isExternal =
                      link.href.startsWith("http") ||
                      link.href.startsWith("mailto:") ||
                      link.href.startsWith("tel:");

                    return (
                      <li key={link.label}>
                        {isExternal ? (
                          <a
                            href={link.href}
                            className="transition hover:text-white"
                            target={link.href.startsWith("http") ? "_blank" : undefined}
                            rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className="transition hover:text-white">
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
