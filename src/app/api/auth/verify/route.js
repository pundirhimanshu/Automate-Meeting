import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/login?error=Invalid verification link', request.url));
        }

        const user = await prisma.user.findUnique({
            where: { verificationToken: token },
        });

        if (!user) {
            return NextResponse.redirect(new URL('/login?error=Invalid or expired verification link', request.url));
        }

        if (user.emailVerified) {
            return NextResponse.redirect(new URL('/login?verified=already', request.url));
        }

        // Mark email as verified and clear the token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
            },
        });

        return NextResponse.redirect(new URL('/login?verified=true', request.url));
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.redirect(new URL('/login?error=Something went wrong during verification', request.url));
    }
}
