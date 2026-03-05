import nodemailer from 'nodemailer';

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const EMAIL_FROM = process.env.EMAIL_FROM || `Scheduler <${process.env.GMAIL_USER}>`;

export async function sendBookingConfirmation({ booking, eventType, host, inviteeName, inviteeEmail, startTime, manageUrl, timezone }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.warn('Gmail credentials missing. Email will not be sent.');
    return;
  }

  const tz = timezone || booking?.timezone || 'UTC';

  const formattedDate = new Date(startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });

  const formattedTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });

  try {
    console.log(`[EMAIL] Attempting to send confirmation emails via Nodemailer...`);

    // Send to Host
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: host.email,
      subject: `New Booking: ${inviteeName} - ${eventType.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">New Meeting Booked!</h2>
          <p>Hi ${host.name},</p>
          <p>A new meeting has been scheduled via <strong>Scheduler</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>When:</strong> ${formattedDate} at ${formattedTime}</p>
          <p><strong>Who:</strong> ${inviteeName} (${inviteeEmail})</p>
          ${booking.location ? `
            <p><strong>${eventType.locationType === 'phone' ? 'Phone Number' :
            eventType.locationType === 'in_person' ? 'Meeting Address' :
              'Location'
          }:</strong> ${booking.location}</p>
          ` : ''}
          ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This is an automated notification from your Scheduler dashboard.</p>
        </div>
      `,
    });

    // Send to Invitee
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: inviteeEmail,
      subject: `Confirmed: ${eventType.title} with ${host.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Meeting Confirmed!</h2>
          <p>Hi ${inviteeName},</p>
          <p>Your meeting with <strong>${host.name}</strong> is confirmed.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>When:</strong> ${formattedDate} at ${formattedTime}</p>
          <p><strong>${eventType.locationType === 'phone' ? 'Phone Number' :
          eventType.locationType === 'in_person' ? 'Meeting Address' :
            'Where'
        }:</strong> ${booking.location || 'Video Call'}</p>
          ${manageUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${manageUrl}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Manage Booking</a>
          </div>
          <p style="font-size: 0.8125rem; color: #6a737d; text-align: center;">Need to cancel or reschedule? Click the button above.</p>
          ` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This is an automated notification from Scheduler.</p>
        </div>
      `,
    });

    console.log('[EMAIL] Confirmation emails sent successfully');
  } catch (error) {
    console.error('[EMAIL] Error sending confirmation email:', error);
  }
}

export async function sendTeamInvitation({ email, teamName, inviterName, inviteLink, eventTitle }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;

  const subject = eventTitle
    ? `Join ${inviterName} for ${eventTitle} on Scheduler`
    : `Join ${teamName || inviterName + "'s Team"} on Scheduler`;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Team Invitation</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join ${eventTitle ? `their <strong>${eventTitle}</strong> event` : `their team <strong>${teamName || ''}</strong>`} on <strong>Scheduler</strong>.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${inviteLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Now</a>
          </div>
          <p style="font-size: 0.8125rem; color: #6a737d;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 0.8125rem; color: #0069ff; word-break: break-all;">${inviteLink}</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This invitation was sent by Scheduler on behalf of ${inviterName}.</p>
        </div>
      `,
    });
    console.log('[EMAIL] Team invitation sent');
  } catch (error) {
    console.error('[EMAIL] Team invitation error:', error);
  }
}

export async function sendVerificationEmail({ email, name, verifyUrl }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verify your email — Scheduler',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Verify Your Email</h2>
          <p>Hi ${name},</p>
          <p>Thank you for signing up for <strong>Scheduler</strong>! Please verify your email address by clicking the button below:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${verifyUrl}" style="background-color: #0069ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email</a>
          </div>
          <p style="font-size: 0.8125rem; color: #6a737d;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 0.8125rem; color: #0069ff; word-break: break-all;">${verifyUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log('[EMAIL] Verification email sent');
  } catch (error) {
    console.error('[EMAIL] Verification email error:', error);
  }
}

export async function sendBookingCancellation({ booking, eventType, host, inviteeName, inviteeEmail, startTime, cancelReason, timezone }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;

  const tz = timezone || booking?.timezone || 'UTC';

  const formattedDate = new Date(startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });

  const formattedTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });

  try {
    // Send to Host
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: host.email,
      subject: `Cancelled: ${inviteeName} - ${eventType.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #d73a49;">Meeting Cancelled</h2>
          <p>Hi ${host.name},</p>
          <p>The following meeting has been cancelled by the invitee.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>When:</strong> ${formattedDate} at ${formattedTime}</p>
          <p><strong>Who:</strong> ${inviteeName} (${inviteeEmail})</p>
          ${cancelReason ? `<p><strong>Reason for cancellation:</strong> ${cancelReason}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This time slot is now available again in your schedule.</p>
        </div>
      `,
    });

    // Send to Invitee
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: inviteeEmail,
      subject: `Cancelled: ${eventType.title} with ${host.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #d73a49;">Meeting Cancelled</h2>
          <p>Hi ${inviteeName},</p>
          <p>Your meeting with <strong>${host.name}</strong> has been successfully cancelled.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>When:</strong> ${formattedDate} at ${formattedTime}</p>
          ${cancelReason ? `<p><strong>Reason for cancellation:</strong> ${cancelReason}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">If you need to reschedule, please visit the original booking link.</p>
        </div>
      `,
    });

    console.log('[EMAIL] Cancellation emails sent successfully');
  } catch (error) {
    console.error('[EMAIL] Error sending cancellation email:', error);
  }
}

export async function sendBookingReschedule({ booking, eventType, host, inviteeName, inviteeEmail, originalStartTime, originalEndTime, newStartTime, newEndTime, timezone }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return;

  const tz = timezone || booking?.timezone || 'UTC';

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });

  const oldDate = fmtDate(originalStartTime);
  const oldTime = `${fmtTime(originalStartTime)} - ${fmtTime(originalEndTime)}`;
  const newDate = fmtDate(newStartTime);
  const newTime = `${fmtTime(newStartTime)} - ${fmtTime(newEndTime)}`;

  try {
    // Send to Invitee (the person who originally booked)
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: inviteeEmail,
      subject: `Rescheduled: ${eventType.title} with ${host.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Meeting Rescheduled</h2>
          <p>Hi ${inviteeName},</p>
          <p>Your meeting with <strong>${host.name}</strong> has been rescheduled to a new date and time.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <div style="padding: 12px 16px; background: #fce4ec; border-radius: 6px; margin: 12px 0;">
            <p style="margin: 0 0 4px; color: #d73a49; font-weight: 600;">Previous Time (Cancelled):</p>
            <p style="margin: 0; text-decoration: line-through; color: #6a737d;">${oldDate} at ${oldTime}</p>
          </div>
          <div style="padding: 12px 16px; background: #e6f4ea; border-radius: 6px; margin: 12px 0;">
            <p style="margin: 0 0 4px; color: #28a745; font-weight: 600;">New Time:</p>
            <p style="margin: 0; color: #24292e; font-weight: 600;">${newDate} at ${newTime}</p>
          </div>
          ${booking.location ? `<p><strong>${eventType.locationType === 'phone' ? 'Phone Number' : eventType.locationType === 'in_person' ? 'Meeting Address' : 'Where'}:</strong> ${booking.location}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This is an automated notification from Scheduler. If you have questions, please contact ${host.name} directly.</p>
        </div>
      `,
    });

    // Send to Host
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: host.email,
      subject: `Rescheduled: ${inviteeName} - ${eventType.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Meeting Rescheduled</h2>
          <p>Hi ${host.name},</p>
          <p>You have rescheduled the following meeting via <strong>Scheduler</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>Who:</strong> ${inviteeName} (${inviteeEmail})</p>
          <div style="padding: 12px 16px; background: #fce4ec; border-radius: 6px; margin: 12px 0;">
            <p style="margin: 0 0 4px; color: #d73a49; font-weight: 600;">Previous Time:</p>
            <p style="margin: 0; text-decoration: line-through; color: #6a737d;">${oldDate} at ${oldTime}</p>
          </div>
          <div style="padding: 12px 16px; background: #e6f4ea; border-radius: 6px; margin: 12px 0;">
            <p style="margin: 0 0 4px; color: #28a745; font-weight: 600;">New Time:</p>
            <p style="margin: 0; color: #24292e; font-weight: 600;">${newDate} at ${newTime}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This is an automated notification from your Scheduler dashboard.</p>
        </div>
      `,
    });

    console.log('[EMAIL] Reschedule emails sent successfully');
  } catch (error) {
    console.error('[EMAIL] Error sending reschedule email:', error);
  }
}
