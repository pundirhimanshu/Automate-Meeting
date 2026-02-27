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
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
            await mkdir(uploadsDir, { recursive: true });

            // Generate unique filename safely
            const originalName = file.name || 'logo.png';
            const ext = originalName.includes('.') ? originalName.split('.').pop() : 'png';
            const filename = `${session.user.id}-${Date.now()}.${ext}`;
            const filepath = path.join(uploadsDir, filename);

            // Write file
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            await writeFile(filepath, buffer);

            // Save to database
            const logoUrl = `/uploads/logos/${filename}`;
            await prisma.user.update({
                where: { id: session.user.id },
                data: { logo: logoUrl },
            });

            console.log('LOGO UPLOAD: Success', logoUrl);
            return NextResponse.json({ logo: logoUrl });
        } catch (fsError) {
            console.error('LOGO UPLOAD FS ERROR:', fsError);
            return NextResponse.json({ error: `Storage error: ${fsError.message}` }, { status: 500 });
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
