import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const origin = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

        if (!accountId) {
            return NextResponse.redirect(`${origin}/integrations/stripe?error=no_account`);
        }

        // Verify the account is active
        const account = await stripe.accounts.retrieve(accountId);

        if (!account.details_submitted) {
            // User didn't finish onboarding, redirect back
            return NextResponse.redirect(`${origin}/integrations/stripe?error=incomplete`);
        }

        // Save the connected account ID to the user
        await prisma.user.update({
            where: { id: session.user.id },
            data: { stripeAccountId: accountId },
        });

        return NextResponse.redirect(`${origin}/integrations/stripe?success=true`);
    } catch (error) {
        console.error('[STRIPE_CALLBACK_ERROR]', error);
        const origin = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
        return NextResponse.redirect(`${origin}/integrations/stripe?error=callback_failed`);
    }
}
