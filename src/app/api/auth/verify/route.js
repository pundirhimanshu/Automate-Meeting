import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        // Use the current request's domain for all redirects to be safe
        const baseUrl = new URL(request.url).origin;
        
        if (!token) {
            console.error('[VERIFY] No token provided');
            return NextResponse.redirect(new URL('/login?error=Invalid verification link', baseUrl));
        }

        const user = await prisma.user.findUnique({
            where: { verificationToken: token },
        });

        if (!user) {
            console.error('[VERIFY] Token not found or invalid:', token);
            return NextResponse.redirect(new URL('/login?error=Invalid or expired verification link', baseUrl));
        }

        if (user.emailVerified) {
            console.log('[VERIFY] User already verified:', user.email);
            return NextResponse.redirect(new URL('/login?verified=already', baseUrl));
        }

        // Mark email as verified and clear the token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
            },
        });

        console.log('[VERIFY] Successfully verified user:', user.email);

        return NextResponse.redirect(new URL('/login?verified=true', baseUrl));
    } catch (error) {
        console.error('[VERIFY] Unexpected error:', error);
        const baseUrl = new URL(request.url).origin;
        return NextResponse.redirect(new URL('/login?error=Something went wrong during verification', baseUrl));
    }
}
