import { getUserSubscription } from '@/lib/subscription';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [subscription, teamMembership] = await Promise.all([
            getUserSubscription(session.user.id),
            prisma.teamMember.findFirst({ where: { userId: session.user.id, role: 'member' } }),
        ]);

        const isOwner = !teamMembership;

        return NextResponse.json({
            plan: subscription?.plan || 'free',
            status: subscription?.status || 'active',
            validUntil: subscription?.validUntil || null,
            isInherited: subscription?.isInherited || false,
            isOwner,
        });
    } catch (error) {
        console.error('[SUBSCRIPTION_GET_ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { plan, transactionId } = await request.json();

        if (!['pro', 'enterprise'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (!transactionId || transactionId.trim().length < 6) {
            return NextResponse.json({ error: 'Please enter a valid UPI Transaction ID' }, { status: 400 });
        }

        const amount = plan === 'pro' ? 499 : 1499;
        const validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + 1);

        const subscription = await prisma.subscription.upsert({
            where: { userId: session.user.id },
            update: {
                plan,
                status: 'pending_verification',
                transactionId: transactionId.trim(),
                amount,
                validUntil,
            },
            create: {
                userId: session.user.id,
                plan,
                status: 'pending_verification',
                transactionId: transactionId.trim(),
                amount,
                validUntil,
            },
        });

        return NextResponse.json({
            success: true,
            plan: subscription.plan,
            status: subscription.status,
            message: 'Payment submitted for verification. Your plan will be activated within 24 hours.',
        });
    } catch (error) {
        console.error('[SUBSCRIPTION_POST_ERROR]', error);
        return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
    }
}
