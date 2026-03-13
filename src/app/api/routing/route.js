import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const forms = await prisma.routingForm.findMany({
            where: { userId: session.user.id },
            include: {
                _count: {
                    select: { submissions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ forms });
    } catch (error) {
        console.error('Error fetching routing forms:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Generate slug from name
        let slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        // Ensure slug uniqueness
        const existing = await prisma.routingForm.findUnique({ where: { slug } });
        if (existing) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
        }

        const form = await prisma.routingForm.create({
            data: {
                name,
                description,
                slug,
                userId: session.user.id
            }
        });

        return NextResponse.json({ form }, { status: 201 });
    } catch (error) {
        console.error('Error creating routing form:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
