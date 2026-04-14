import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        const origin = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

        // Create a Stripe Connect account for the user
        const account = await stripe.accounts.create({
            type: 'standard',
            metadata: { userId: session.user.id },
        });

        // Create an account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${origin}/integrations/stripe?error=refresh`,
            return_url: `${origin}/api/integrations/stripe/callback?accountId=${account.id}`,
            type: 'account_onboarding',
        });

        return NextResponse.redirect(accountLink.url);
    } catch (error) {
        console.error('--- STRIPE CONNECT ERROR START ---');
        console.error(error);
        console.error('--- STRIPE CONNECT ERROR END ---');
        return NextResponse.json({ 
            error: 'Connect Failed', 
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
