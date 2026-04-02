import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Always return success to prevent email enumeration
        const successResponse = NextResponse.json({
            message: 'If an account exists with this email, a password reset link has been sent.',
        });

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Silently return success if user not found or is a Google-only account
        if (!user || (user.authProvider === 'google' && !user.password)) {
            return successResponse;
        }

        // Generate reset token and set 1-hour expiry
        const resetToken = crypto.randomUUID();
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: expires,
            },
        });

        // Build the reset URL (same pattern as signup route)
        const host = request.headers.get('host');
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const forwardedHost = request.headers.get('x-forwarded-host');

        // Robust protocol detection
        let protocol = 'https';
        if (forwardedProto) {
            protocol = forwardedProto;
        } else if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
            protocol = 'http';
        }

        // Use forwarded host if behind a proxy
        const currentHost = forwardedHost || host;
        const detectedBaseUrl = `${protocol}://${currentHost}`;

        // Trust the actual host the user is visiting ABOVE a hardcoded NEXTAUTH_URL.
        const baseUrl = (currentHost && !currentHost.includes('localhost') && !currentHost.includes('127.0.0.1'))
            ? detectedBaseUrl
            : (process.env.NEXTAUTH_URL || detectedBaseUrl);

        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const resetUrl = `${cleanBaseUrl}/reset-password?token=${resetToken}`;

        console.log(`[FORGOT-PASSWORD] Reset URL generated for ${email}: ${resetUrl}`);

        await sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetUrl,
        });

        return successResponse;
    } catch (error) {
        console.error('[FORGOT-PASSWORD] Error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
