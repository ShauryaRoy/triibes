export interface NavItem {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
}

export interface FeaturedEventItem {
  id: string;
  title: string;
  scheduleLabel: string;
  primaryTag: string;
  secondaryTag?: string;
  attendeeLabel: string;
  ctaLabel: string;
  ctaVariant?: "sunset" | "light" | "glass";
  imageUrl?: string | null;
  href: string;
}

export interface EventCardItem {
  id: string;
  title: string;
  timeLabel: string;
  summary: string;
  statusTag: string;
  attendeeLabel: string;
  ctaLabel: string;
  imageUrl?: string | null;
  href: string;
}

export interface TribeCardItem {
  id: string;
  name: string;
  description: string;
  weekLabel: string;
  memberLabel: string;
  imageUrl?: string | null;
  href: string;
}

export interface HomeCopy {
  brand: string;
  topNav: NavItem[];
  featured: {
    heading: string;
    subheading: string;
  };
  events: {
    heading: string;
    ctaLabel: string;
  };
  tribes: {
    heading: string;
    ctaLabel: string;
  };
  footer: {
    links: Array<{ id: string; label: string; href: string }>;
    legal: string;
  };
}
