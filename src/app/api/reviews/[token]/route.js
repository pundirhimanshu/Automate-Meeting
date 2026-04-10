import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { token } = params;
        const booking = await prisma.booking.findUnique({
            where: { manageToken: token },
            include: { 
                review: true, 
                host: { select: { name: true, avatar: true } }, 
                eventType: { select: { title: true } } 
            }
        });

        if (!booking) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        
        return NextResponse.json(booking);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    try {
        const { token } = params;
        const { rating, comment } = await req.json();

        const booking = await prisma.booking.findUnique({
            where: { manageToken: token },
            include: { review: true }
        });

        if (!booking) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
        if (booking.review) return NextResponse.json({ error: 'Review already submitted' }, { status: 400 });
        if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });

        const review = await prisma.review.create({
            data: {
                rating: Number(rating),
                comment,
                bookingId: booking.id,
                hostId: booking.hostId
            }
        });

        return NextResponse.json({ success: true, review });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
