import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmation({ booking, eventType, host, inviteeName, inviteeEmail, startTime }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing. Email will not be sent.');
    return;
  }

  const formattedDate = new Date(startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  try {
    console.log(`[EMAIL] Attempting to send confirmation emails...`);
    console.log(`[EMAIL] Host: ${host.email}, Invitee: ${inviteeEmail}`);

    // Send to Host
    const hostResult = await resend.emails.send({
      from: 'Automate Meetings <onboarding@resend.dev>',
      to: host.email,
      subject: `New Booking: ${inviteeName} - ${eventType.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">New Meeting Booked!</h2>
          <p>Hi ${host.name},</p>
          <p>A new meeting has been scheduled via <strong>Automate Meetings</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p><strong>What:</strong> ${eventType.title}</p>
          <p><strong>When:</strong> ${formattedDate} at ${formattedTime}</p>
          <p><strong>Who:</strong> ${inviteeName} (${inviteeEmail})</p>
          ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This is an automated notification from your Automate Meetings dashboard.</p>
        </div>
      `,
    });

    if (hostResult.error) {
      console.error('[EMAIL] Host email failed:', hostResult.error);
    } else {
      console.log('[EMAIL] Host email sent:', hostResult.data.id);
    }

    // Send to Invitee
    const inviteeResult = await resend.emails.send({
      from: 'Automate Meetings <onboarding@resend.dev>',
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
          <p><strong>Where:</strong> ${eventType.location || 'Video Call'}</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">To manage this booking, please contact the host directly.</p>
        </div>
      `,
    });

    if (inviteeResult.error) {
      console.error('[EMAIL] Invitee email failed:', inviteeResult.error);
    } else {
      console.log('[EMAIL] Invitee email sent:', inviteeResult.data.id);
    }
  } catch (error) {
    console.error('[EMAIL] Unexpected error in email utility:', error);
  }
}

export async function sendTeamInvitation({ email, teamName, inviterName, inviteLink }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing. Email will not be sent.');
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'Automate Meetings <onboarding@resend.dev>',
      to: email,
      subject: `Join ${teamName} on Automate Meetings`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Team Invitation</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to join their team <strong>${teamName}</strong> on <strong>Automate Meetings</strong>.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${inviteLink}" style="background-color: #0069ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Team</a>
          </div>
          <p style="font-size: 0.8125rem; color: #6a737d;">If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 0.8125rem; color: #0069ff; word-break: break-all;">${inviteLink}</p>
          <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 20px 0;" />
          <p style="color: #6a737d; font-size: 12px;">This invitation was sent by Automate Meetings on behalf of ${inviterName}.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error('[EMAIL] Invitation failed:', result.error);
    } else {
      console.log('[EMAIL] Invitation sent:', result.data.id);
    }
  } catch (error) {
    console.error('[EMAIL] Invitation error:', error);
  }
}

export async function sendVerificationEmail({ email, name, verifyUrl }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing. Verification email will not be sent.');
    return;
  }

  try {
    const result = await resend.emails.send({
      from: 'Automate Meetings <onboarding@resend.dev>',
      to: email,
      subject: 'Verify your email — Automate Meetings',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
          <h2 style="color: #0069ff;">Verify Your Email</h2>
          <p>Hi ${name},</p>
          <p>Thank you for signing up for <strong>Automate Meetings</strong>! Please verify your email address by clicking the button below:</p>
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

    if (result.error) {
      console.error('[EMAIL] Verification email failed:', result.error);
    } else {
      console.log('[EMAIL] Verification email sent:', result.data.id);
    }
  } catch (error) {
    console.error('[EMAIL] Verification email error:', error);
  }
}
