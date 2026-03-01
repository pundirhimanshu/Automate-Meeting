import { prisma } from './prisma';

/**
 * Gets the effective subscription for a user.
 * If the user has their own active subscription, it returns that.
 * If the user is a member of a team, it checks the owner's subscription.
 * If part of multiple teams, it returns the best plan available.
 */
export async function getUserSubscription(userId) {
    try {
        // 1. Check user's own subscription
        const userSubscription = await prisma.subscription.findUnique({
            where: { userId },
        });

        // If user has an active pro or enterprise plan, return it
        if (userSubscription && userSubscription.status === 'active' && userSubscription.plan !== 'free') {
            return {
                plan: userSubscription.plan,
                status: userSubscription.status,
                validUntil: userSubscription.validUntil,
                isInherited: false
            };
        }

        // 2. Check if user is a member of any teams
        const teamMemberships = await prisma.teamMember.findMany({
            where: { userId, role: { not: 'owner' } },
            include: {
                team: {
                    include: {
                        members: {
                            where: { role: 'owner' },
                            include: {
                                user: {
                                    include: { subscription: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (teamMemberships.length > 0) {
            let bestPlan = userSubscription?.plan || 'free';
            let bestSubscription = userSubscription || { plan: 'free', status: 'active' };
            let isInherited = false;

            for (const membership of teamMemberships) {
                const owner = membership.team.members[0]?.user;
                const ownerSub = owner?.subscription;

                if (ownerSub && ownerSub.status === 'active') {
                    if (isPlanBetter(ownerSub.plan, bestPlan)) {
                        bestPlan = ownerSub.plan;
                        bestSubscription = ownerSub;
                        isInherited = true;
                    }
                }
            }

            return {
                plan: bestSubscription.plan,
                status: bestSubscription.status,
                validUntil: bestSubscription.validUntil,
                isInherited
            };
        }

        // 3. Fallback to user's subscription or default free
        return {
            plan: userSubscription?.plan || 'free',
            status: userSubscription?.status || 'active',
            validUntil: userSubscription?.validUntil || null,
            isInherited: false
        };
    } catch (error) {
        console.error('[GET_USER_SUBSCRIPTION_ERROR]', error);
        return { plan: 'free', status: 'active', validUntil: null, isInherited: false };
    }
}

function isPlanBetter(planA, planB) {
    const weights = { enterprise: 3, pro: 2, free: 1 };
    return (weights[planA] || 0) > (weights[planB] || 0);
}
