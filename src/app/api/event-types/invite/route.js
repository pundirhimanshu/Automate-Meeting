import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { eventTypeId, emails, type } = await request.json();

        if (!emails || !emails.length) {
            return NextResponse.json({ error: 'At least one email is required' }, { status: 400 });
        }

        // If eventTypeId exists, fetch event type info for the invitation
        let eventType = null;
        if (eventTypeId) {
            eventType = await prisma.eventType.findFirst({
                where: { id: eventTypeId, userId: session.user.id },
            });
        }

        // Store invitations (we'll track them as notifications for now)
        const results = [];
        for (const email of emails) {
            // Check if invitee is an existing user
            const invitee = await prisma.user.findUnique({ where: { email } });

            // Create a notification/invitation record
            const notification = await prisma.notification.create({
                data: {
                    userId: session.user.id,
                    type: 'team_invite',
                    title: `Team Invitation Sent`,
                    message: `Invitation sent to ${email} for ${eventType?.title || type || 'event'} (${type || 'team'} meeting)`,
                },
            });

            results.push({
                email,
                status: 'invited',
                isExistingUser: !!invitee,
                notificationId: notification.id,
            });
        }

        return NextResponse.json({
            success: true,
            invitations: results,
            message: `${results.length} invitation(s) sent successfully`,
        });
    } catch (error) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
