import type { Request, Response } from 'express';
import { storage } from './storage';
import { format } from 'date-fns';

/**
 * Generate HTML with SEO meta tags for server-side rendering
 */
function generateHTML(options: {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: 'website' | 'article' | 'event';
  structuredData?: any;
}) {
  const {
    title,
    description,
    image = 'https://tribbe.in/og-image.jpg',
    url,
    type = 'website',
    structuredData
  } = options;

  const fullTitle = title.includes('Tribbe') ? title : `${title} | Tribbe`;
  const escapedDescription = description.replace(/"/g, '&quot;').substring(0, 160);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${fullTitle}</title>
    <meta name="title" content="${fullTitle}">
    <meta name="description" content="${escapedDescription}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${fullTitle}">
    <meta property="og:description" content="${escapedDescription}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="Tribbe">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${url}">
    <meta name="twitter:title" content="${fullTitle}">
    <meta name="twitter:description" content="${escapedDescription}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Additional SEO -->
    <link rel="canonical" href="${url}">
    <meta name="robots" content="index, follow">
    ${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/client/src/main.tsx"></script>
  </body>
</html>`;
}

/**
 * SSR handler for event pages
 */
export async function handleEventSSR(req: Request, res: Response) {
  try {
    const idOrSlug = req.params.id;
    
    // Try to get event by ID or slug
    let event;
    if (/^\d+$/.test(idOrSlug)) {
      // It's a numeric ID
      const eventId = parseInt(idOrSlug);
      event = await storage.getEvent(eventId);
    } else {
      // It's a slug
      event = await storage.getEventBySlug(idOrSlug);
    }

    if (!event) {
      return res.status(404).send('Event not found');
    }

    // Format date for display
    const eventDate = event.datetime 
      ? format(new Date(event.datetime), 'EEEE, MMMM d, yyyy')
      : 'Date TBA';

    // Create description
    const description = event.description 
      ? event.description.substring(0, 160)
      : `Join us for ${event.title} on ${eventDate}. Discover amazing events and connect with your community on Tribbe.`;

    // Build the full URL (prefer slug over ID)
    const baseUrl = process.env.APP_URL || 'https://tribbe.in';
    const eventUrl = `${baseUrl}/events/${event.slug || event.id}`;

    // Get event image or use default
    const eventImage = event.imageUrl || `${baseUrl}/og-image.jpg`;

    // Create structured data for Google
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": description,
      "image": eventImage,
      "startDate": event.datetime,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": event.eventType === 'online' 
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      "location": event.location ? {
        "@type": "Place",
        "name": event.location,
        "address": event.location
      } : undefined,
      "organizer": {
        "@type": "Organization",
        "name": "Tribbe",
        "url": baseUrl
      }
    };

    const html = generateHTML({
      title: event.title,
      description,
      image: eventImage,
      url: eventUrl,
      type: 'event',
      structuredData
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[SSR] Error rendering event page:', error);
    res.status(500).send('Internal server error');
  }
}

/**
 * SSR handler for group pages
 */
export async function handleGroupSSR(req: Request, res: Response) {
  try {
    const idOrSlug = req.params.id;
    
    // Try to get by slug first, then by ID
    let group;
    if (isNaN(Number(idOrSlug))) {
      // It's a slug
      group = await storage.getCommunityBySlug(idOrSlug);
    } else {
      // It's an ID
      const groupId = parseInt(idOrSlug);
      group = await storage.getCommunity(groupId);
    }

    if (!group) {
      return res.status(404).send('Group not found');
    }

    // Create description
    const description = group.description 
      ? group.description.substring(0, 160)
      : `Join ${group.name} on Tribbe. Connect with people who share your interests and discover amazing events together.`;

    // Build the full URL
    const baseUrl = process.env.APP_URL || 'https://tribbe.in';
    const groupUrl = `${baseUrl}/groups/${group.slug || group.id}`;

    // Get group image or use default
    const groupImage = group.imageUrl || `${baseUrl}/og-image.jpg`;

    // Create structured data for Google
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": group.name,
      "description": description,
      "image": groupImage,
      "url": groupUrl
    };

    const html = generateHTML({
      title: group.name,
      description,
      image: groupImage,
      url: groupUrl,
      type: 'website',
      structuredData
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[SSR] Error rendering group page:', error);
    res.status(500).send('Internal server error');
  }
}

/**
 * SSR handler for home/discover page
 */
export async function handleHomeSSR(req: Request, res: Response) {
  try {
    const baseUrl = process.env.APP_URL || 'https://tribbe.in';
    
    const html = generateHTML({
      title: 'Tribbe - Discover Amazing Events & Connect with Your Community',
      description: 'Join Tribbe to discover local events, create unforgettable experiences, and connect with people who share your interests. Plan activities, join groups, and build your community.',
      url: baseUrl,
      type: 'website'
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('[SSR] Error rendering home page:', error);
    res.status(500).send('Internal server error');
  }
}
