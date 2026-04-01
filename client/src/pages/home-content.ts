import type {
  EventCardItem,
  FeaturedEventItem,
  HomeCopy,
  TribeCardItem,
} from "@/components/home/types";

export const homeCopy: HomeCopy = {
  brand: "Triibes",
  topNav: [
    { id: "events", label: "Events", href: "/", isActive: true },
    { id: "groups", label: "Groups", href: "/groups" },
    { id: "discover", label: "Discover", href: "/discover" },
  ],
  featured: {
    heading: "Featured Energy",
    subheading: "Hand-picked vibes for your week.",
  },
  events: {
    heading: "Happening near you",
    ctaLabel: "See all",
  },
  tribes: {
    heading: "Active tribes near you",
    ctaLabel: "Find more",
  },
  footer: {
    links: [
      { id: "about", label: "About", href: "#" },
      { id: "safety", label: "Safety", href: "#" },
      { id: "terms", label: "Terms", href: "#" },
      { id: "privacy", label: "Privacy", href: "#" },
      { id: "careers", label: "Careers", href: "#" },
    ],
    legal: "© 2026 Triibes. Feel the energy.",
  },
};

export const mockFeaturedItems: FeaturedEventItem[] = [
  {
    id: "featured-1",
    title: "Sunset Rooftop Beats",
    scheduleLabel: "TONIGHT @ 8:00 PM",
    primaryTag: "Starting soon",
    secondaryTag: "Last 3 spots",
    attendeeLabel: "12 going",
    ctaLabel: "Grab spot",
    ctaVariant: "sunset",
    imageUrl: null,
    href: "/discover",
  },
  {
    id: "featured-2",
    title: "Community Supper Club",
    scheduleLabel: "SATURDAY @ 7:00 PM",
    primaryTag: "High Energy",
    attendeeLabel: "24 going",
    ctaLabel: "Join",
    ctaVariant: "light",
    imageUrl: null,
    href: "/discover",
  },
  {
    id: "featured-3",
    title: "Sunrise Flow & Brew",
    scheduleLabel: "SUNDAY @ 9:00 AM",
    primaryTag: "Wellness",
    attendeeLabel: "18 going",
    ctaLabel: "Grab spot",
    ctaVariant: "glass",
    imageUrl: null,
    href: "/discover",
  },
];

export const mockEventCards: EventCardItem[] = [
  {
    id: "event-1",
    title: "Craft Beer Social",
    timeLabel: "7PM",
    summary: "Casual meetup. Open to all.",
    statusTag: "Tonight",
    attendeeLabel: "8 going",
    ctaLabel: "Join",
    imageUrl: null,
    href: "/discover",
  },
  {
    id: "event-2",
    title: "Badminton Mix",
    timeLabel: "6PM",
    summary: "Intermediate play. Friendly vibes.",
    statusTag: "Filling fast",
    attendeeLabel: "12 going",
    ctaLabel: "Join",
    imageUrl: null,
    href: "/discover",
  },
  {
    id: "event-3",
    title: "Vinyl Listening",
    timeLabel: "8PM",
    summary: "Share your favorite tracks.",
    statusTag: "Tomorrow",
    attendeeLabel: "15 going",
    ctaLabel: "Join",
    imageUrl: null,
    href: "/discover",
  },
  {
    id: "event-4",
    title: "Paint & Sip",
    timeLabel: "5PM",
    summary: "No experience needed. Fun only.",
    statusTag: "Filling fast",
    attendeeLabel: "20 going",
    ctaLabel: "Join",
    imageUrl: null,
    href: "/discover",
  },
];

export const mockTribeCards: TribeCardItem[] = [
  {
    id: "tribe-1",
    name: "Creative Hustlers",
    description: "Weekly coworking and brainstorming for local digital creators.",
    weekLabel: "18 going this week",
    memberLabel: "120 members",
    imageUrl: null,
    href: "/groups",
  },
  {
    id: "tribe-2",
    name: "Early Bird Hikers",
    description: "Saturday morning trail runs and scenic sunrise peaks.",
    weekLabel: "32 going this week",
    memberLabel: "450 members",
    imageUrl: null,
    href: "/groups",
  },
  {
    id: "tribe-3",
    name: "Sci-Fi Readers",
    description: "Monthly book discussion over coffee at various local cafes.",
    weekLabel: "12 going this week",
    memberLabel: "84 members",
    imageUrl: null,
    href: "/groups",
  },
];
