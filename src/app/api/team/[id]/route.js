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

        // Find the team where the current user is the owner
        const ownerMember = await prisma.teamMember.findFirst({
            where: { userId: session.user.id, role: 'owner' },
            include: { team: true }
        });

        if (!ownerMember) {
            return NextResponse.json({ error: 'Only team owners can remove members' }, { status: 403 });
        }

        // Check if trying to remove the owner
        if (id === session.user.id) {
            return NextResponse.json({ error: 'You cannot remove yourself from your own team' }, { status: 400 });
        }

        // Remove the member
        await prisma.teamMember.delete({
            where: {
                teamId_userId: {
                    teamId: ownerMember.teamId,
                    userId: id
                }
            }
        });

        return NextResponse.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
