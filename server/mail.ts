import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@tribbe.in';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Tribbe Events';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback: strip HTML tags for plain text
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`Email sent successfully. Message ID: ${result.data?.id}`);
  } catch (error) {
    console.error('Error sending email:', error);
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Event Reminder: ${eventName}</h2>
      
      <p style="color: #666; font-size: 16px;">
        This is a reminder about your upcoming event:
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${eventName}</h3>
        <p style="margin: 0; color: #666; font-size: 14px;">
          📅 ${formattedDate}
        </p>
      </div>
      
      ${customMessage ? `<p style="color: #666; font-size: 14px; line-height: 1.6;">${customMessage}</p>` : ''}
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated reminder from Tribbe Events. Please do not reply to this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: `Reminder: ${eventName}`,
    html,
    text: `Event Reminder: ${eventName}\n\nDate: ${formattedDate}${customMessage ? '\n\n' + customMessage : ''}`,
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Event ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
      
      <p style="color: #666; font-size: 16px;">
        ${statusMessages[status]}:
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Host:</strong> ${hostName}</p>
        <p style="margin: 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
        ${rejectionReason ? `<p style="margin: 10px 0 0 0; color: #c00;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
      </div>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Tribbe Admin Panel.
      </p>
    </div>
  `;

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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Tribbe Events! 🎉</h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${userName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Thank you for signing up for Tribbe! We're excited to have you join our community of event enthusiasts.
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        To complete your registration and verify your email address, please click the button below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #999; font-size: 14px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color: #4F46E5; word-break: break-all;">${verificationLink}</a>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        If you didn't create this account, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: 'Welcome to Tribbe - Verify Your Email',
    html,
    text: `Welcome to Tribbe Events!\n\nHi ${userName},\n\nPlease verify your email by clicking this link: ${verificationLink}\n\nIf you didn't create this account, you can safely ignore this email.`,
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
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${isApproved ? '#10B981' : '#EF4444'};">
        ${isApproved ? '✅' : '❌'} Your Event Has Been ${status.charAt(0).toUpperCase() + status.slice(1)}
      </h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${hostName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        ${isApproved 
          ? `Great news! Your event "${eventName}" has been approved and is now live on Tribbe.`
          : `Unfortunately, your event "${eventName}" has been rejected.`
        }
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${isApproved ? '#10B981' : '#EF4444'}; font-weight: 600;">${status.toUpperCase()}</span></p>
        ${reason ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      
      ${isApproved && eventLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${eventLink}" 
             style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Your Event
          </a>
        </div>
      ` : ''}
      
      ${!isApproved ? `
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          You can edit your event and resubmit it for approval. Please address the reason mentioned above.
        </p>
      ` : ''}
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Tribbe Events.
      </p>
    </div>
  `;

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
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${isApproved ? '#10B981' : '#EF4444'};">
        ${isApproved ? '✨' : '❌'} Discover Request ${status.charAt(0).toUpperCase() + status.slice(1)}
      </h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${hostName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        ${isApproved 
          ? `Great news! Your request to feature "${eventOrGroupName}" in the Discover section has been approved.`
          : `Your request to feature "${eventOrGroupName}" in the Discover section has been declined.`
        }
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>${itemType}:</strong> ${eventOrGroupName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Request Type:</strong> Discover Feature</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${isApproved ? '#10B981' : '#EF4444'}; font-weight: 600;">${status.toUpperCase()}</span></p>
        ${reason ? `<p style="margin: 10px 0 0 0; color: #666;"><strong>Note:</strong> ${reason}</p>` : ''}
      </div>
      
      ${isApproved ? `
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          Your ${type} is now visible in the Discover section and will reach more users!
        </p>
      ` : ''}
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Tribbe Events.
      </p>
    </div>
  `;

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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You've Been Invited to Join a Group! 👥</h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${inviteeName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        <strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Tribbe.
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #333;">${groupName}</h3>
        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">${groupDescription}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" 
           style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #999; font-size: 14px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${invitationLink}" style="color: #4F46E5; word-break: break-all;">${invitationLink}</a>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        If you don't want to join this group, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail({
    to: inviteeEmail,
    subject: `${inviterName} invited you to join "${groupName}" on Tribbe`,
    html,
    text: `${inviterName} has invited you to join "${groupName}" on Tribbe.\n\n${groupDescription}\n\nAccept invitation: ${invitationLink}`,
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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${isBanned ? '#EF4444' : '#10B981'};">
        ${isBanned ? '⚠️ Account Suspended' : '✅ Account Reinstated'}
      </h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${userName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        ${isBanned 
          ? `Your Tribbe account has been ${duration ? 'temporarily suspended' : 'permanently banned'}.`
          : 'Your Tribbe account has been reinstated and you can now access all features again.'
        }
      </p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Account:</strong> ${userEmail}</p>
        <p style="margin: 0 0 10px 0;"><strong>Status:</strong> <span style="color: ${isBanned ? '#EF4444' : '#10B981'}; font-weight: 600;">${isBanned ? 'SUSPENDED' : 'ACTIVE'}</span></p>
        ${duration ? `<p style="margin: 0 0 10px 0;"><strong>Duration:</strong> ${duration}</p>` : ''}
        <p style="margin: 0; color: #666;"><strong>Reason:</strong> ${reason}</p>
      </div>
      
      ${isBanned ? `
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          During this period, you won't be able to:
        </p>
        <ul style="color: #666; font-size: 14px; line-height: 1.8;">
          <li>Create or join events</li>
          <li>Post in groups</li>
          <li>Send messages</li>
          <li>Access certain platform features</li>
        </ul>
      ` : ''}
      
      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        ${isBanned 
          ? 'If you believe this is a mistake, please contact our support team.'
          : 'Thank you for your understanding. Please ensure you follow our community guidelines going forward.'
        }
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Tribbe Events.
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: isBanned ? 'Tribbe Account Suspended' : 'Tribbe Account Reinstated',
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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">🔐 Password Reset Request</h2>
      
      <p style="color: #666; font-size: 16px;">
        Hi ${userName},
      </p>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We received a request to reset your Tribbe account password. Click the button below to create a new password:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #999; font-size: 14px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: #4F46E5; word-break: break-all;">${resetLink}</a>
      </p>
      
      <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #92400E; font-size: 14px;">
          ⚠️ This link will expire in ${expiryTime}. If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
        </p>
      </div>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        For security reasons, this link can only be used once and will expire soon.
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: 'Reset Your Tribbe Password',
    html,
    text: `Hi ${userName},\n\nYou requested to reset your Tribbe password. Click this link to reset: ${resetLink}\n\nThis link expires in ${expiryTime}.\n\nIf you didn't request this, please ignore this email.`,
  });
}
