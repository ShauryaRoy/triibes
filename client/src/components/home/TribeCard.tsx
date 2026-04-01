import { Link } from "wouter";
import type { TribeCardItem } from "@/components/home/types";
import { ImageFallback } from "@/components/home/ImageFallback";

interface TribeCardProps {
  tribe: TribeCardItem;
}

export function TribeCard({ tribe }: TribeCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-[#f6eefa] transition-colors duration-300 hover:bg-[#eee5f2]">
      <div className="relative aspect-[16/9] overflow-hidden">
        <ImageFallback
          imageUrl={tribe.imageUrl}
          alt={tribe.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col justify-between p-6">
      <div>
        <span className="mb-3 inline-flex rounded-full bg-[#811cd9]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#811cd9]">
          {tribe.weekLabel}
        </span>

        <h3 className="font-headline mb-2 text-2xl font-black text-[#312d35] transition-colors group-hover:text-[#a63400]">
          {tribe.name}
        </h3>
        <p className="mb-6 line-clamp-2 text-[#5f5a62]">{tribe.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#5f5a62]">{tribe.memberLabel}</span>
        <Link href={tribe.href}>
          <button className="rounded-full bg-white px-6 py-3 font-headline text-xs font-black uppercase tracking-widest text-[#312d35] shadow-sm transition-all group-hover:shadow-md">
            View
          </button>
        </Link>
      </div>
      </div>
    </article>
  );
}
