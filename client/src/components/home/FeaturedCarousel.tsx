import { Link } from "wouter";
import { ImageFallback } from "@/components/home/ImageFallback";
import type { FeaturedEventItem } from "@/components/home/types";

interface FeaturedCarouselProps {
  items: FeaturedEventItem[];
}

const ctaClassByVariant: Record<NonNullable<FeaturedEventItem["ctaVariant"]>, string> = {
  sunset:
    "bg-gradient-to-r from-[#ff5f1f] to-[#ff7948] text-white hover:shadow-orange-500/20",
  light: "bg-white text-black hover:bg-zinc-100",
  glass: "bg-white/20 backdrop-blur-md text-white hover:bg-white/30",
};

export function FeaturedCarousel({ items }: FeaturedCarouselProps) {
  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto pb-12">
      {items.map((item) => {
        const ctaVariant = item.ctaVariant || "sunset";

        return (
          <article
            key={item.id}
            className="group relative aspect-[16/10] min-w-[85%] snap-center overflow-hidden rounded-2xl md:min-w-[60%] lg:min-w-[45%]"
          >
            <ImageFallback
              imageUrl={item.imageUrl}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute left-6 top-6 flex gap-3">
              <span className="rounded-full bg-[#a63400] px-4 py-1 text-xs font-bold uppercase tracking-widest text-white">
                {item.primaryTag}
              </span>
              {item.secondaryTag ? (
                <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                  {item.secondaryTag}
                </span>
              ) : null}
            </div>

            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-4">
              <div className="text-white">
                <p className="mb-1 text-sm font-bold opacity-80">{item.scheduleLabel}</p>
                <h2 className="font-headline mb-2 text-3xl font-black leading-none">{item.title}</h2>
                <span className="text-sm font-medium">{item.attendeeLabel}</span>
              </div>

              <Link href={item.href}>
                <button
                  className={`rounded-full px-8 py-4 font-headline text-sm font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 ${ctaClassByVariant[ctaVariant]}`}
                >
                  {item.ctaLabel}
                </button>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
