import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true, name: true, email: true, username: true,
                timezone: true, brandColor: true, avatar: true, logo: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, timezone, brandColor, currentPassword, newPassword } = body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (timezone !== undefined) updateData.timezone = timezone;
        if (brandColor !== undefined) updateData.brandColor = brandColor;

        // Password change
        if (newPassword && currentPassword) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                id: true, name: true, email: true, username: true,
                timezone: true, brandColor: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
