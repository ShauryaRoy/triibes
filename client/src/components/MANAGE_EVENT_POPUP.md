# Manage Event Popup - Documentation

## Overview

The **Manage Event Popup** is a comprehensive modal component that provides event hosts with centralized control over all event management features. It's accessible from both the Event Creation and Edit Event pages via a "Manage" button.

## Location & Access

- **Button Position**: Right sidebar, directly below the "Theme" button
- **Available On**:
  - Create Event Page (`/create-event`)
  - Edit Event Page (`/edit-event/:id`)

## Features

### 1. **Guest List Control** 👥

Control who can attend and manage guest permissions:

- **Require Approval**: Manually approve each guest before they can attend
- **Allow +1s**: Let guests bring additional people (configurable max)
- **Guest Status Overview**: View current guest count and approval settings

### 2. **RSVP Settings** ✅

Configure how guests can RSVP:

- **Enable/Disable RSVP**: Toggle RSVP functionality on/off
- **Maximum Capacity**: Set limits on total attendees (1-10,000)
- **Require Approval**: Manually approve RSVPs before confirming

### 3. **Privacy Settings** 🔒

Control event visibility and information display:

- **Public/Private Mode**: Toggle event discoverability
- **Show Guest List**: Control whether attendee names are visible
- **Show Guest Count**: Display or hide total number of attendees
- **Privacy Level Summary**: Quick overview of current settings

### 4. **Co-Host Management** 👑

Add and manage event co-hosts:

- **Invite Co-Hosts**: Send invitations via email
- **Permission Control**: Co-hosts get full management access
- **Current Co-Hosts List**: View and manage existing co-hosts
- **Permission Overview**: Clear indication of co-host capabilities

### 5. **Payment Options** 💰

Configure event monetization and cost management:

- **Enable Ticketing**: Charge guests for event access
- **Ticket Pricing**: Set custom ticket prices
- **Cost Split**: Enable expense splitting among attendees
- **Contribution Link**: Add Venmo/PayPal/other payment links
- **Payment Status**: View current payment configuration

### 6. **Communication Tools** 💬

Send messages and updates to guests:

- **Message Types**: Updates, Reminders, Announcements, Important Changes
- **Broadcast Messages**: Send to all confirmed guests
- **Quick Actions**: Pre-configured message templates
- **Delivery Methods**: Email and push notifications
- **Guest Count Display**: See how many people will receive the message

## Technical Implementation

### Component Structure

```tsx
<ManageEventPopup
  isOpen={boolean}
  onClose={() => void}
  eventId={number}
  eventData={object}
  onUpdate={(data) => void}
/>
```

### Props Interface

```typescript
interface ManageEventPopupProps {
  isOpen: boolean; // Controls popup visibility
  onClose: () => void; // Callback when popup closes
  eventId?: number; // Event ID for edit mode
  eventData?: {
    // Current event settings
    maxGuests?: number;
    isPublic?: boolean;
    rsvpEnabled?: boolean;
    requireApproval?: boolean;
    allowPlusOnes?: boolean;
    maxPlusOnes?: number;
    showGuestList?: boolean;
    showGuestCount?: boolean;
    ticketingEnabled?: boolean;
    ticketPrice?: number;
    costSplitEnabled?: boolean;
    contributionLink?: string;
  };
  onUpdate?: (data: any) => void; // Callback with updated settings
}
```

### State Management

The component maintains separate state objects for each section:

- `guestSettings` - Guest list controls
- `rsvpSettings` - RSVP configuration
- `privacySettings` - Privacy controls
- `paymentSettings` - Payment options
- `messageContent` - Communication content
- `coHostEmail` - Co-host invitation email

### Tab Navigation

Six main tabs organize features:

1. **guests** - Guest List Control
2. **rsvp** - RSVP Settings
3. **privacy** - Privacy Settings
4. **cohosts** - Co-Host Management
5. **payments** - Payment Options
6. **communication** - Communication Tools

## Usage Examples

### Create Event Page

```tsx
import { ManageEventPopup } from "@/components/manage-event-popup";

const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);

// Manage Button
<button onClick={() => setIsManagePopupOpen(true)}>
  Manage
</button>

// Popup Component
<ManageEventPopup
  isOpen={isManagePopupOpen}
  onClose={() => setIsManagePopupOpen(false)}
  eventData={{
    maxGuests: watch('maxGuests'),
    isPublic: !watch('isPrivate'),
  }}
  onUpdate={(data) => {
    if (data.maxGuests) setValue('maxGuests', data.maxGuests);
    if (data.isPublic !== undefined) setValue('isPrivate', !data.isPublic);
  }}
/>
```

### Edit Event Page

```tsx
<ManageEventPopup
  isOpen={isManagePopupOpen}
  onClose={() => setIsManagePopupOpen(false)}
  eventId={parseInt(eventId || "0")}
  eventData={{
    maxGuests: event.maxGuests,
    isPublic: event.isPublic,
    // ... other settings
  }}
  onUpdate={(data) => {
    // Update event with new management settings
  }}
/>
```

## UI/UX Design

### Visual Style

- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Dark Theme**: Consistent with app's dark aesthetic
- **Gradient Accents**: Color-coded icons for each section
- **Smooth Animations**: Hover effects and transitions
- **Responsive Layout**: Adapts to different screen sizes

### Color Coding

- 🔵 **Blue** (Guest List) - Trust and reliability
- 🟢 **Green** (RSVP) - Confirmation and go-ahead
- 🟣 **Purple** (Privacy) - Security and exclusivity
- 🟡 **Yellow** (Co-Hosts) - Premium/VIP status
- 🟢 **Emerald** (Payments) - Money and transactions
- 🔵 **Cyan** (Communication) - Information flow

### Accessibility

- Proper semantic HTML structure
- Keyboard navigation support
- Focus management
- ARIA labels for screen readers
- High contrast text
- Clear visual feedback

## Integration Points

### With Event Form

- Syncs with form values (maxGuests, isPrivate)
- Updates trigger form value changes
- Validation respect form constraints

### With Backend API

Ready for integration with backend endpoints:

- `POST /api/events/:id/settings` - Update event settings
- `POST /api/events/:id/cohosts` - Add co-hosts
- `POST /api/events/:id/messages` - Send guest messages
- `GET /api/events/:id/guests` - Fetch guest list

### With Toast Notifications

Uses toast system for user feedback:

- Settings saved confirmations
- Co-host invitations sent
- Messages broadcast notifications
- Error handling

## Future Enhancements

### Planned Features

1. **Guest List View**: Display and manage current guests
2. **Approval Queue**: Interface for approving pending RSVPs
3. **Message History**: Log of sent communications
4. **Analytics Dashboard**: Guest engagement metrics
5. **Template Library**: Pre-written message templates
6. **Automated Reminders**: Schedule automatic notifications
7. **Check-in System**: QR code-based guest check-in
8. **Dietary Restrictions**: Collect and manage guest preferences

### API Integration TODO

- [ ] Connect guest approval system
- [ ] Implement co-host permissions
- [ ] Add payment processor integration
- [ ] Set up email/SMS delivery system
- [ ] Create notification scheduling
- [ ] Build analytics tracking

## Best Practices

### For Hosts

1. Set guest capacity before promoting event
2. Enable approval for exclusive events
3. Use communication tools for important updates
4. Add co-hosts for large events
5. Configure privacy settings appropriately

### For Developers

1. Always validate settings before save
2. Provide clear error messages
3. Maintain state consistency with form
4. Handle API errors gracefully
5. Test all tab transitions
6. Ensure mobile responsiveness

## Troubleshooting

### Common Issues

1. **Settings not saving**: Check onUpdate callback implementation
2. **Tab not switching**: Verify activeTab state management
3. **Form sync issues**: Ensure watch() values are current
4. **Mobile layout problems**: Check responsive breakpoints

### Debug Tips

- Use React DevTools to inspect state
- Check console for validation errors
- Verify props are passed correctly
- Test each tab independently

## Component Dependencies

### External Libraries

- `lucide-react` - Icons
- `@/components/ui/*` - UI components (Button, Input, Switch, etc.)
- `@/hooks/use-toast` - Toast notifications
- `@/components/ui/scroll-area` - Scrollable content

### Internal Components

- Button - Action triggers
- Input - Text/number inputs
- Label - Form labels
- Switch - Toggle controls
- Textarea - Multi-line text
- Select - Dropdown menus
- ScrollArea - Scrollable container

## Performance Considerations

### Optimizations

- Lazy state initialization
- Debounced input updates (if needed)
- Conditional rendering of tabs
- Memoized child components
- Efficient event handlers

### Bundle Size

- Component size: ~15KB (minified)
- Tree-shakeable exports
- Minimal external dependencies
- Optimized icon imports

---

**Version**: 1.0.0
**Last Updated**: November 3, 2025
**Maintainer**: MOVO Development Team
