import { Skeleton } from "@/components/ui/skeleton"; // Assume shadcn/ui or create simple

export function SkeletonProductCard() {
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(74,49,24,0.08)] transition-all duration-300 animate-pulse">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#ede3d7]">
        <Skeleton className="h-full w-full" />
      </div>
      
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded-full bg-slate-200" />
          <Skeleton className="h-7 w-4/5 rounded-lg" />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="flex items-end gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
        
        <div className="h-12 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

