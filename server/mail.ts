import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.error('[mail] ⚠️  RESEND_API_KEY is not set — all emails will fail');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Verified domain: mail.triibes.in (ap-northeast-1, Tokyo)
const FROM_TRANSACTIONAL = 'Triibes <onboarding@mail.triibes.in>';
const FROM_HELLO        = 'Triibes <hello@mail.triibes.in>';
const FROM_NOTIFICATIONS = 'Triibes Reminder <reminders@mail.triibes.in>';
const FROM_PAYMENTS = 'Triibes Payments <payments@mail.triibes.in>';
const FROM_DEFAULT      = process.env.RESEND_FROM_EMAIL
  ? `${process.env.RESEND_FROM_NAME || 'Triibes'} <${process.env.RESEND_FROM_EMAIL}>`
  : FROM_TRANSACTIONAL;

// ---------------------------------------------------------------------------
// Shared email layout — navbar-style logo + minimalistic wrapper
// ---------------------------------------------------------------------------
function emailLayout(body: string): string {
  const year = new Date().getFullYear();
  // Logo mirrors the navbar: bold "Triibes" text + small violet dot
  const logo = `
    <a href="https://triibes.in" style="text-decoration:none;display:inline-flex;align-items:center;gap:3px;">
      <span style="font-size:26px;font-weight:400;color:#0f172a;letter-spacing:0px;font-family:'Satisfy',cursive;">Triibes</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#7C3AED;margin-left:1px;vertical-align:middle;position:relative;top:-2px;"></span>
    </a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <link href="https://fonts.googleapis.com/css2?family=Satisfy&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo header -->
          <tr>
            <td style="padding:0 0 20px 4px;">
              ${logo}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 4px 8px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">Questions? <a href="mailto:support@triibes.in" style="color:#7C3AED;text-decoration:none;">support@triibes.in</a></p>
              <p style="margin:0;font-size:11px;color:#D1D5DB;">&copy; ${year} <span style="font-family:'Satisfy',cursive;font-size:13px;">Triibes</span> &bull; All rights reserved</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Reusable CTA button
function ctaButton(href: string, label: string, color = '#7C3AED'): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="border-radius:8px;background:${color};">
        <a href="${href}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// Reusable detail row for info cards
function detailRow(label: string, value: string, extraStyle = '', last = false): string {
  return `<tr>
    <td style="padding:12px 0;${last ? '' : 'border-bottom:1px solid #F3F4F6;'}">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;display:block;margin-bottom:3px;">${label}</span>
      <span style="font-size:15px;font-weight:600;color:#111827;${extraStyle}">${value}</span>
    </td>
  </tr>`;
}

// Status pill badge
function statusPill(text: string, success: boolean): string {
  const bg  = success ? '#ECFDF5' : '#FEF2F2';
  const col = success ? '#059669' : '#DC2626';
  return `<span style="display:inline-block;background:${bg};color:${col};font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;">${text}</span>`;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html, text, from }: SendEmailOptions): Promise<void> {
  const fromAddress = from ?? FROM_DEFAULT;

  if (!process.env.RESEND_API_KEY) {
    console.error('[mail] RESEND_API_KEY is not set – email not sent');
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log(`[mail] Sending email — from: "${fromAddress}" to: "${to}" subject: "${subject}"`);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (result.error) {
      console.error('[mail] Resend API error:', JSON.stringify(result.error));
      throw new Error(`Resend rejected the email: ${result.error.message} (name: ${result.error.name})`);
    }

    console.log(`[mail] ✅ Email sent successfully — id: ${result.data?.id} to: "${to}"`);
  } catch (error: any) {
    console.error('[mail] ❌ Exception while sending email:', error?.message || error);
    throw error;
  }
}

/**
 * Send event reminder email
 */
export async function sendReminderEmail(
  userEmail: string,
  eventName: string,
  eventDate: Date,
  customMessage?: string
): Promise<void> {
  const formattedDate = eventDate.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.TIMEZONE || 'UTC',
  });

  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Event Reminder</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${eventName}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">&#128197; ${formattedDate}</p>
      ${customMessage ? `<p style="margin:0;font-size:15px;color:#374151;line-height:1.7;border-top:1px solid #F3F4F6;padding-top:20px;">${customMessage}</p>` : ''}
    </div>
  `);

  await sendEmail({
    to: userEmail,
    subject: `Reminder: ${eventName}`,
    html,
    text: `Event Reminder: ${eventName}\n\nDate: ${formattedDate}${customMessage ? '\n\n' + customMessage : ''}`,
  });
}

/**
 * Send host reminder email to approved attendee
 */
export async function sendHostReminderEmail(
  userEmail: string,
  hostName: string,
  eventName: string,
  customMessage?: string
): Promise<void> {
  const safeHostName = hostName?.trim() || 'Host';
  const safeEventName = eventName?.trim() || 'Event';
  const safeCustomMessage = customMessage?.trim() || 'Please complete your RSVP to confirm your spot.';

  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Host Reminder</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">${safeHostName} reminded you about ${safeEventName} Event</h1>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Host Name', safeHostName)}
            ${detailRow('Event Name', safeEventName)}
          </table>
        </td></tr>
      </table>
    </div>
  `);

  await sendEmail({
    from: FROM_NOTIFICATIONS,
    to: userEmail,
    subject: `${safeHostName} reminded you about ${safeEventName} Event`,
    html,
    text: `${safeHostName} reminded you about ${safeEventName} Event\n\nHost name: ${safeHostName}\nEvent name: ${safeEventName}\nCustom message: ${safeCustomMessage}`,
  });
}

/**
 * Send event approval notification email (admin)
 */
export async function sendApprovalNotificationEmail(
  adminEmail: string,
  eventName: string,
  hostName: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const statusMessages = {
    pending: 'A new event is pending approval',
    approved: 'Event has been approved',
    rejected: 'Event has been rejected',
  };

  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Admin Notice</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">Event ${status.charAt(0).toUpperCase() + status.slice(1)}</h1>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Event', eventName)}
            ${detailRow('Host', hostName)}
            ${detailRow('Status', status.toUpperCase(), status === 'approved' ? 'color:#059669;' : status === 'rejected' ? 'color:#DC2626;' : '', !rejectionReason)}
            ${rejectionReason ? detailRow('Reason', rejectionReason, 'color:#DC2626;', true) : ''}
          </table>
        </td></tr>
      </table>
    </div>
  `);

  await sendEmail({
    to: adminEmail,
    subject: `Event ${status.toUpperCase()}: ${eventName}`,
    html,
    text: `${statusMessages[status]}: ${eventName}\nHost: ${hostName}\nStatus: ${status}${rejectionReason ? '\nReason: ' + rejectionReason : ''}`,
  });
}

/**
 * Send user registration/verification email
 */
export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationLink: string
): Promise<void> {
  const html = emailLayout(`
    <div style="padding:36px 36px 32px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Verify your email</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${userName}, one quick step to get started.</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">Click the button below to verify your email address and activate your <span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span> account.</p>
      ${ctaButton(verificationLink, 'Verify Email Address')}
      <p style="margin:28px 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;">
        Or paste this link into your browser:<br>
        <a href="${verificationLink}" style="color:#7C3AED;word-break:break-all;text-decoration:none;">${verificationLink}</a>
      </p>
      <p style="margin:20px 0 0;font-size:12px;color:#D1D5DB;border-top:1px solid #F3F4F6;padding-top:16px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `);

  await sendEmail({
    to: userEmail,
    subject: 'Welcome to Triibes - Verify Your Email',
    html,
    text: `Welcome to Triibes Events!\n\nHi ${userName},\n\nPlease verify your email by clicking this link: ${verificationLink}\n\nIf you didn't create this account, you can safely ignore this email.`,
  });
}

/**
 * Send event approval/rejection notification to event host
 */
export async function sendEventStatusEmail(
  hostEmail: string,
  hostName: string,
  eventName: string,
  status: 'approved' | 'rejected',
  reason?: string,
  eventLink?: string
): Promise<void> {
  const isApproved = status === 'approved';
  
  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Event Status</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">Your event has been ${status}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${hostName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        ${isApproved
          ? `Great news — <strong>${eventName}</strong> is approved and now live on <span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span>.`
          : `Unfortunately, <strong>${eventName}</strong> was not approved at this time.`
        }
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Event', eventName)}
            ${detailRow('Status', statusPill(status.toUpperCase(), isApproved), '', !reason)}
            ${reason ? detailRow('Reason', reason, '', true) : ''}
          </table>
        </td></tr>
      </table>
      ${isApproved && eventLink ? ctaButton(eventLink, 'View Your Event') : ''}
      ${!isApproved ? `<p style="margin:24px 0 0;font-size:14px;color:#6B7280;line-height:1.7;">You can edit and resubmit your event after addressing the reason above.</p>` : ''}
    </div>
  `);

  await sendEmail({
    to: hostEmail,
    subject: `Event ${isApproved ? 'Approved' : 'Rejected'}: ${eventName}`,
    html,
    text: `Your event "${eventName}" has been ${status}.\n${reason ? '\nReason: ' + reason : ''}${eventLink ? '\n\nView your event: ' + eventLink : ''}`,
  });
}

/**
 * Send discover request status update (approved/rejected)
 */
export async function sendDiscoverStatusEmail(
  hostEmail: string,
  hostName: string,
  eventOrGroupName: string,
  type: 'event' | 'group',
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  const isApproved = status === 'approved';
  const itemType = type === 'event' ? 'Event' : 'Group';
  
  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Discover Request</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">Your request has been ${status}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${hostName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        ${isApproved
          ? `<strong>${eventOrGroupName}</strong> is now featured in the Discover section and will reach more users.`
          : `Your request to feature <strong>${eventOrGroupName}</strong> in the Discover section was not approved at this time.`
        }
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow(itemType, eventOrGroupName)}
            ${detailRow('Status', statusPill(status.toUpperCase(), isApproved), '', !reason)}
            ${reason ? detailRow('Note', reason, '', true) : ''}
          </table>
        </td></tr>
      </table>
    </div>
  `);

  await sendEmail({
    to: hostEmail,
    subject: `Discover Request ${isApproved ? 'Approved' : 'Declined'}: ${eventOrGroupName}`,
    html,
    text: `Your Discover request for "${eventOrGroupName}" has been ${status}.\n${reason ? '\nNote: ' + reason : ''}`,
  });
}

/**
 * Send group invitation email
 */
export async function sendGroupInvitationEmail(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  groupName: string,
  groupDescription: string,
  invitationLink: string
): Promise<void> {
  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Group Invitation</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">You've been invited</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${inviteeName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        <strong>${inviterName}</strong> has invited you to join a group on <span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827;">${groupName}</p>
          <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.7;">${groupDescription}</p>
        </td></tr>
      </table>
      ${ctaButton(invitationLink, 'Accept Invitation')}
      <p style="margin:20px 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;">Or paste: <a href="${invitationLink}" style="color:#7C3AED;word-break:break-all;text-decoration:none;">${invitationLink}</a></p>
      <p style="margin:16px 0 0;font-size:12px;color:#D1D5DB;">If you don't want to join, you can safely ignore this email.</p>
    </div>
  `);

  await sendEmail({
    to: inviteeEmail,
    subject: `${inviterName} invited you to join "${groupName}" on Triibes`,
    html,
    text: `${inviterName} has invited you to join "${groupName}" on Triibes.\n\n${groupDescription}\n\nAccept invitation: ${invitationLink}`,
  });
}

/**
 * Send user ban notification
 */
export async function sendUserBanEmail(
  userEmail: string,
  userName: string,
  reason: string,
  isBanned: boolean,
  duration?: string
): Promise<void> {
  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Account Notice</p>
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;">${isBanned ? 'Account Suspended' : 'Account Reinstated'}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${userName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        ${isBanned
          ? `Your <span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span> account has been ${duration ? 'temporarily suspended' : 'permanently banned'}.`
          : 'Your account has been reinstated — you can now access all features again.'
        }
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Account', userEmail)}
            ${detailRow('Status', statusPill(isBanned ? 'SUSPENDED' : 'ACTIVE', !isBanned), '', !duration && !reason)}
            ${duration ? detailRow('Duration', duration, '', !reason) : ''}
            ${detailRow('Reason', reason, '', true)}
          </table>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:14px;color:#6B7280;line-height:1.7;">
        ${isBanned
          ? 'If you believe this is a mistake, please contact <a href="mailto:support@triibes.in" style="color:#7C3AED;text-decoration:none;">support@triibes.in</a>.'
          : 'Please ensure you follow our community guidelines going forward.'
        }
      </p>
    </div>
  `);

  await sendEmail({
    to: userEmail,
    subject: isBanned ? 'Triibes Account Suspended' : 'Triibes Account Reinstated',
    html,
    text: `${isBanned ? 'Your account has been suspended' : 'Your account has been reinstated'}.\n\nReason: ${reason}${duration ? '\nDuration: ' + duration : ''}`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetLink: string,
  expiryTime: string = '1 hour'
): Promise<void> {
  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9CA3AF;font-weight:600;">Security</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Hi ${userName}</p>
      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">We received a request to reset your <span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span> password. Click the button below to create a new one.</p>
      ${ctaButton(resetLink, 'Reset Password')}
      <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;">Or paste: <a href="${resetLink}" style="color:#7C3AED;word-break:break-all;text-decoration:none;">${resetLink}</a></p>
      <div style="margin:24px 0 0;background:#FFFBEB;border-left:3px solid #F59E0B;border-radius:0 6px 6px 0;padding:12px 16px;">
        <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">This link expires in <strong>${expiryTime}</strong> and can only be used once. If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `);

  await sendEmail({
    to: userEmail,
    subject: 'Reset Your Triibes Password',
    html,
    text: `Hi ${userName},\n\nYou requested to reset your Triibes password. Click this link to reset: ${resetLink}\n\nThis link expires in ${expiryTime}.\n\nIf you didn't request this, please ignore this email.`,
  });
}

// ---------------------------------------------------------------------------
// Transactional emails
// ---------------------------------------------------------------------------

/**
 * Unified registration confirmation email.
 * Works for both paid and free events — the price field controls the display.
 *   price > 0  → "Amount Paid: ₹X"
 *   price === 0 → "Free Event"
 */
export async function sendRegistrationConfirmationEmail({
  userEmail,
  userName,
  eventName,
  eventDate,
  price,
}: {
  userEmail: string;
  userName: string;
  eventName: string;
  eventDate: Date;
  price: number; // in paise (0 = free)
}): Promise<void> {
  const formattedDate = eventDate.toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const isFree = price === 0;
  const formattedAmount = isFree
    ? '₹0 · Free Event'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(price / 100);

  const badgeLabel = isFree ? '&#10003; Registered' : '&#10003; Payment Confirmed';
  const subjectLine = isFree
    ? `You're registered – ${eventName}`
    : `Payment Confirmed – ${eventName}`;
  const fromAddress = isFree ? FROM_TRANSACTIONAL : FROM_PAYMENTS;

  const html = emailLayout(`
    <div style="padding:32px 36px 36px;">
      <!-- Status badge + heading -->
      <div style="display:inline-block;background:#ECFDF5;border-radius:20px;padding:4px 14px;margin-bottom:16px;">
        <span style="color:#059669;font-size:12px;font-weight:600;">${badgeLabel}</span>
      </div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">You're going to ${eventName}!</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#6B7280;">Hi ${userName}, your spot is confirmed. See you there.</p>

      <!-- Details card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;">
        <tr><td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Event', eventName)}
            ${detailRow('Date &amp; Time', formattedDate)}
            ${detailRow(isFree ? 'Price' : 'Amount Paid', formattedAmount, isFree ? '' : 'color:#059669;font-size:18px;', true)}
          </table>
        </td></tr>
      </table>
    </div>
  `);

  try {
    await sendEmail({
      from: fromAddress,
      to: userEmail,
      subject: subjectLine,
      html,
      text: `Hi ${userName},\n\nYou're registered for "${eventName}"!\n\nDate: ${formattedDate}\n${isFree ? 'Price: Free' : `Amount Paid: ${formattedAmount}`}\n\nSee you there!\n\n– Triibes`,
    });
    console.log(`[mail] Registration confirmation sent to ${userEmail} for event "${eventName}"`);
  } catch (error) {
    console.error(`[mail] Failed to send registration confirmation to ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Send welcome email on first login / account creation.
 */
export async function sendFirstLoginEmail({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}): Promise<void> {
  const firstName = userName.split(' ')[0] || userName;

  const html = emailLayout(`
    <div style="padding:36px 36px 32px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Welcome, ${firstName}! &#127881;</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">We're glad you're here.</p>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;"><span style="font-family:'Satisfy',cursive;font-size:17px;font-weight:400;">Triibes</span> is where communities come alive — discover events, plan meetups, manage RSVPs, and stay connected with the people who matter to you.</p>

      <!-- Feature list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:16px;vertical-align:middle;">&#127891;</span>
          <span style="font-size:14px;color:#374151;margin-left:10px;vertical-align:middle;"><strong>Discover events</strong> near you or online</span>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:16px;vertical-align:middle;">&#128101;</span>
          <span style="font-size:14px;color:#374151;margin-left:10px;vertical-align:middle;"><strong>Join or create groups</strong> around shared interests</span>
        </td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
          <span style="font-size:16px;vertical-align:middle;">&#127881;</span>
          <span style="font-size:14px;color:#374151;margin-left:10px;vertical-align:middle;"><strong>Host events</strong> and manage RSVPs effortlessly</span>
        </td></tr>
        <tr><td style="padding:10px 0;">
          <span style="font-size:16px;vertical-align:middle;">&#128180;</span>
          <span style="font-size:14px;color:#374151;margin-left:10px;vertical-align:middle;"><strong>Collect payments</strong> and track expenses in one place</span>
        </td></tr>
      </table>

      ${ctaButton('https://triibes.in', 'Explore Events \u2192')}
    </div>
  `);

  try {
    await sendEmail({
      from: FROM_HELLO,
      to: userEmail,
      subject: 'Welcome to Triibes',
      html,
      text: `Hi ${firstName},\n\nWelcome to Triibes! We're glad you're here.\n\nTriibes is where communities come alive — discover events, plan meetups, manage RSVPs, and stay connected with the people who matter to you.\n\nExplore events now: https://triibes.in\n\n– The Triibes Team`,
    });
    console.log(`[mail] Welcome email sent to ${userEmail}`);
  } catch (error) {
    console.error(`[mail] Failed to send welcome email to ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Send group newsletter to a member
 */
export async function sendGroupNewsletterEmail({
  memberEmail,
  memberName,
  groupName,
  groupSlug,
  senderName,
  subject,
  content,
}: {
  memberEmail: string;
  memberName: string;
  groupName: string;
  groupSlug?: string;
  senderName: string;
  subject: string;
  content: string;
}): Promise<void> {
  const groupLink = groupSlug
    ? `https://triibes.in/groups/${groupSlug}`
    : `https://triibes.in`;

  // Convert plain newlines to <br> for HTML
  const htmlContent = content
    .split('\n')
    .map(line => line.trim() === '' ? '<br>' : `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.75;">${line}</p>`)
    .join('');

  const html = emailLayout(`
    <div style="background:#7C3AED;padding:28px 36px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.7);font-weight:600;">Newsletter from</p>
      <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${groupName}</h1>
    </div>
    <div style="padding:32px 36px 36px;">
      <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#111827;">${subject}</h2>
      <div style="margin:0 0 28px;">${htmlContent}</div>
      <div style="border-top:1px solid #F3F4F6;padding-top:20px;">
        ${ctaButton(groupLink, 'Visit ' + groupName)}
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.6;">
        You received this email because you're a member of <strong>${groupName}</strong> on Triibes.<br>
        Sent by ${senderName}.
      </p>
    </div>
  `);

  await sendEmail({
    from: FROM_HELLO,
    to: memberEmail,
    subject: `[${groupName}] ${subject}`,
    html,
    text: `${groupName} Newsletter\n\n${subject}\n\n${content}\n\n---\nYou received this because you're a member of ${groupName} on Triibes.\nVisit: ${groupLink}`,
  });
}
