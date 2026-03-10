import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { sendTeamInvitation } from '@/lib/email';
import { getUserSubscription } from '@/lib/subscription';
import { getMaxTeamMembers } from '@/lib/plans';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find all teams the user belongs to.
        const userTeams = await prisma.teamMember.findMany({
            where: { userId: session.user.id },
            include: {
                team: {
                    include: {
                        members: {
                            include: { user: { select: { name: true, email: true, id: true, logo: true } } }
                        },
                        invitations: {
                            where: { status: 'pending' }
                        }
                    }
                }
            }
        });

        if (!userTeams || userTeams.length === 0) {
            return NextResponse.json({ members: [], invitations: [] });
        }

        // Use the first team as the primary team object for the response, 
        // prioritizing one where the user is an owner if available.
        const primaryTeamMember = userTeams.find(tm => tm.role === 'owner') || userTeams[0];
        const primaryTeam = primaryTeamMember.team;

        // Consolidate unique active members from all teams
        const memberMap = new Map();
        userTeams.forEach(tm => {
            tm.team.members.forEach(m => {
                if (!memberMap.has(m.userId)) {
                    memberMap.set(m.userId, m);
                }
            });
        });
        const allMembers = Array.from(memberMap.values());

        // Consolidate pending invitations from all teams
        const inviteMap = new Map();
        userTeams.forEach(tm => {
            tm.team.invitations.forEach(inv => {
                if (!inviteMap.has(inv.email)) {
                    inviteMap.set(inv.email, {
                        id: inv.id,
                        role: inv.role,
                        status: 'pending',
                        user: {
                            name: inv.email.split('@')[0],
                            email: inv.email,
                            id: null,
                            isPending: true
                        }
                    });
                }
            });
        });
        const allPendingInvites = Array.from(inviteMap.values());

        return NextResponse.json({
            team: primaryTeam,
            members: [...allMembers, ...allPendingInvites]
        });
    } catch (error) {
        console.error('CRITICAL ERROR in /api/team GET:', error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { email, role } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

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

        // Plan enforcement: check max team members
        const [{ plan }, currentMembersCount, pendingInvitesCount] = await Promise.all([
            getUserSubscription(session.user.id),
            prisma.teamMember.count({ where: { teamId } }),
            prisma.invitation.count({ where: { teamId, status: 'pending' } }),
        ]);

        const maxMembers = getMaxTeamMembers(plan);
        if (maxMembers !== -1 && (currentMembersCount + pendingInvitesCount) >= maxMembers) {
            return NextResponse.json({
                error: `You've reached the maximum team members (${maxMembers}) for the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Upgrade to invite more.`,
            }, { status: 403 });
        }

        // Check if user is already in the team
        const existingMember = await prisma.teamMember.findFirst({
            where: {
                teamId,
                user: { email }
            }
        });

        if (existingMember) {
            return NextResponse.json({ error: 'User is already in the team' }, { status: 400 });
        }

        // Check for existing pending invitation
        const existingInvite = await prisma.invitation.findUnique({
            where: { teamId_email: { teamId, email } }
        });

        if (existingInvite && existingInvite.status === 'pending') {
            return NextResponse.json({ error: 'Invitation is already pending' }, { status: 400 });
        }

        const userToInvite = await prisma.user.findUnique({ where: { email } });

        if (userToInvite) {
            // Member exists, add directly and notify
            await prisma.teamMember.create({
                data: {
                    teamId,
                    userId: userToInvite.id,
                    role: role || 'member'
                }
            });

            await prisma.notification.create({
                data: {
                    userId: userToInvite.id,
                    type: 'team_invite',
                    title: 'Team Invitation',
                    message: `${session.user.name} added you to their team: ${teamMember.team.name}`,
                }
            });

            return NextResponse.json({ message: 'Member added to team' });
        } else {
            // Member doesn't exist, create an Invitation record and send email
            const token = crypto.randomBytes(32).toString('hex');

            await prisma.invitation.create({
                data: {
                    email,
                    teamId,
                    role: role || 'member',
                    invitedBy: session.user.name,
                    token,
                }
            });

            // Prepare invite link (assuming /signup?invite=TOKEN)
            const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/signup?invite=${token}`;

            await sendTeamInvitation({
                email,
                teamName: teamMember.team.name,
                inviterName: session.user.name,
                inviteLink
            });

            return NextResponse.json({ message: 'Invitation email sent to guest' });
        }
    } catch (error) {
        console.error('CRITICAL ERROR in /api/team POST:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
