import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params; // This is the userId to remove (or teamMemberId)

        // Find all teams where the current user is an owner
        const ownedTeams = await prisma.teamMember.findMany({
            where: { userId: session.user.id, role: 'owner' }
        });

        if (ownedTeams.length === 0) {
            return NextResponse.json({ error: 'Only team owners can remove members' }, { status: 403 });
        }

        const ownedTeamIds = ownedTeams.map(t => t.teamId);

        // Find the specific membership record to delete that belongs to one of the owner's teams
        const memberToDelete = await prisma.teamMember.findFirst({
            where: {
                userId: id,
                teamId: { in: ownedTeamIds }
            }
        });

        if (!memberToDelete) {
            return NextResponse.json({ error: 'Member not found in any of your teams' }, { status: 404 });
        }

        // Check if trying to remove the owner (redundant check but safe)
        if (memberToDelete.userId === session.user.id && memberToDelete.role === 'owner') {
            return NextResponse.json({ error: 'You cannot remove yourself as owner' }, { status: 400 });
        }

        // Remove the member
        await prisma.teamMember.delete({
            where: {
                id: memberToDelete.id
            }
        });

        return NextResponse.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
