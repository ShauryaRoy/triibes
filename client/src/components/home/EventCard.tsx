import { Link } from "wouter";
import { ImageFallback } from "@/components/home/ImageFallback";
import type { EventCardItem } from "@/components/home/types";

interface EventCardProps {
  event: EventCardItem;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="w-[280px] max-w-[280px] flex-none rounded-2xl bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-xl">
      <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-xl">
        <ImageFallback imageUrl={event.imageUrl} alt={event.title} className="block h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#a63400] backdrop-blur">
          {event.statusTag}
        </span>
      </div>

      <div className="px-1.5">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="font-headline text-lg font-bold leading-tight text-[#312d35]">{event.title}</h3>
          <span className="text-base font-black text-[#811cd9]">{event.timeLabel}</span>
        </div>

        <p className="mb-2 line-clamp-1 text-xs text-[#5f5a62]">{event.summary}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{event.attendeeLabel}</span>
          <Link href={event.href}>
            <button className="rounded-full bg-[#eee5f2] px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#811cd9] transition-colors hover:bg-[#811cd9] hover:text-white">
              {event.ctaLabel}
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}
