import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('logo');

        if (!file) {
            console.error('LOGO UPLOAD: No file in formData');
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            console.error('LOGO UPLOAD: Invalid type', file.type);
            return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 });
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            console.error('LOGO UPLOAD: File too large', file.size);
            return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
        }

        try {
            // Convert to Base64 for Vercel/Serverless compatibility (no read-only FS issues)
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64Image = buffer.toString('base64');
            const logoUrl = `data:${file.type};base64,${base64Image}`;

            // Save to database
            await prisma.user.update({
                where: { id: session.user.id },
                data: { logo: logoUrl },
            });

            console.log('LOGO UPLOAD: Success (Base64 stored in DB)');
            return NextResponse.json({ logo: logoUrl });
        } catch (error) {
            console.error('LOGO UPLOAD CRITICAL ERROR:', error);
            return NextResponse.json({ error: 'Upload process failed' }, { status: 500 });
        }
    } catch (error) {
        console.error('LOGO UPLOAD CRITICAL ERROR:', error);
        return NextResponse.json({ error: 'Upload process failed' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { logo: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
