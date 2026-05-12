import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const contactFilter = searchParams.get('contactFilter') || 'all';
        const companyFilter = searchParams.get('companyFilter') || '';

        const skip = (page - 1) * limit;

        const where = { userId: session.user.id };
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (companyFilter) {
            where.company = companyFilter;
        }

        if (contactFilter === 'with-meetings') {
            where.bookings = {
                some: {
                    status: { not: 'cancelled' }
                }
            };
        } else if (contactFilter === 'no-meetings') {
            where.bookings = {
                none: {
                    status: { not: 'cancelled' }
                }
            };
        }

        const [total, contacts, uniqueCompanies] = await Promise.all([
            prisma.contact.count({ where }),
            prisma.contact.findMany({
                where,
                include: {
                    fieldValues: {
                        include: { field: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.contact.findMany({
                where: { userId: session.user.id },
                distinct: ['company'],
                select: { company: true },
            })
        ]);

        // Fetch last and next meeting dates for each contact
        const enriched = await Promise.all(
            contacts.map(async (contact) => {
                const now = new Date();

                const lastBooking = await prisma.booking.findFirst({
                    where: {
                        hostId: session.user.id,
                        inviteeEmail: contact.email,
                        startTime: { lt: now },
                        status: { not: 'cancelled' },
                    },
                    orderBy: { startTime: 'desc' },
                    select: { startTime: true },
                });

                const nextBooking = await prisma.booking.findFirst({
                    where: {
                        hostId: session.user.id,
                        inviteeEmail: contact.email,
                        startTime: { gte: now },
                        status: { not: 'cancelled' },
                    },
                    orderBy: { startTime: 'asc' },
                    select: { startTime: true },
                });

                return {
                    ...contact,
                    lastMeetingDate: lastBooking?.startTime || null,
                    nextMeetingDate: nextBooking?.startTime || null,
                };
            })
        );

        return NextResponse.json({ 
            contacts: enriched,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            uniqueCompanies: uniqueCompanies.map(c => c.company).filter(Boolean)
        });

    } catch (error) {
        console.error('Contacts GET error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, email, phone, company, notes, fieldValues } = await request.json();

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const contact = await prisma.contact.create({
            data: {
                name,
                email,
                phone: phone || null,
                company: company || null,
                notes: notes || null,
                userId: session.user.id,
                fieldValues: fieldValues?.length > 0
                    ? {
                        create: fieldValues
                            .filter((fv) => fv.value?.trim())
                            .map((fv) => ({
                                fieldId: fv.fieldId,
                                value: fv.value,
                            })),
                    }
                    : undefined,
            },
            include: { fieldValues: { include: { field: true } } },
        });

        return NextResponse.json({ contact }, { status: 201 });
    } catch (error) {
        console.error('Contacts POST error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
