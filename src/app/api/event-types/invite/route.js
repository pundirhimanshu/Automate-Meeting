import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { sendTeamInvitation } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { eventTypeId, emails, type } = await request.json();

        if (!emails || !emails.length) {
            return NextResponse.json({ error: 'At least one email is required' }, { status: 400 });
        }

        // Fetch event type if provided
        let eventType = null;
        if (eventTypeId) {
            eventType = await prisma.eventType.findFirst({
                where: { id: eventTypeId, userId: session.user.id },
            });
        }

        // Ensure user has a team
        let teamMember = await prisma.teamMember.findFirst({
            where: { userId: session.user.id, role: 'owner' },
            include: { team: true }
        });

        if (!teamMember) {
            const team = await prisma.team.create({
                data: {
                    name: `${session.user.name}'s Team`,
                    slug: `${session.user.username || (session.user.name ? session.user.name.toLowerCase().replace(/\s+/g, '-') : 'team')}-team-${Math.random().toString(36).substring(7)}`,
                    members: {
                        create: {
                            userId: session.user.id,
                            role: 'owner'
                        }
                    }
                }
            });
            teamMember = { team };
        }

        const teamId = teamMember.team.id;
        const results = [];

        for (const email of emails) {
            const normalizedEmail = email.toLowerCase().trim();

            // Check if already in team
            const existingMember = await prisma.teamMember.findFirst({
                where: {
                    teamId,
                    user: { email: normalizedEmail }
                }
            });

            if (existingMember) {
                results.push({ email: normalizedEmail, status: 'already_member' });
                continue;
            }

            const userToInvite = await prisma.user.findUnique({ where: { email: normalizedEmail } });

            if (userToInvite) {
                // Member exists, add to team and notify
                await prisma.teamMember.create({
                    data: {
                        teamId,
                        userId: userToInvite.id,
                        role: 'member'
                    }
                });

                await prisma.notification.create({
                    data: {
                        userId: userToInvite.id,
                        type: 'team_invite',
                        title: 'Added to Team',
                        message: `${session.user.name} added you to their team: ${teamMember.team.name}`,
                    }
                });

                results.push({ email: normalizedEmail, status: 'added' });
            } else {
                // Guest, create invitation and email
                const token = crypto.randomBytes(32).toString('hex');

                await prisma.invitation.upsert({
                    where: { teamId_email: { teamId, email: normalizedEmail } },
                    update: { token, status: 'pending' },
                    create: {
                        email: normalizedEmail,
                        teamId,
                        token,
                        invitedBy: session.user.name,
                    }
                });

                const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?invite=${token}`;

                await sendTeamInvitation({
                    email: normalizedEmail,
                    teamName: teamMember.team.name,
                    inviterName: session.user.name,
                    inviteLink,
                    eventTitle: eventType?.title
                });

                results.push({ email: normalizedEmail, status: 'invited' });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            message: `${results.length} invitation(s) processed`,
        });
    } catch (error) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
