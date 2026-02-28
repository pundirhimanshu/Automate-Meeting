import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    try {
        const { username } = params;

        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                name: true,
                username: true,
                brandColor: true,
                logo: true,
                timezone: true,
                eventTypes: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        description: true,
                        duration: true,
                        type: true,
                        color: true,
                        location: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
