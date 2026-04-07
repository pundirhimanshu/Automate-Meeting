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

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                username: true,
                name: true,
                avatar: true,
                logo: true,
                pageAboutMe: true,
                pageHeadline: true,
                pageSocialYouTube: true,
                pageSocialFacebook: true,
                pageSocialWhatsApp: true,
                pageSocialInstagram: true,
                pageSidePanelColor: true,
                pageSelectedEventTypes: true,
                pageImage: true,
                pageSchedulerHeader: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('[PAGE_CONFIG_GET_ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch page configuration' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        
        const updateData = {};
        
        if (body.pageAboutMe !== undefined) updateData.pageAboutMe = body.pageAboutMe;
        if (body.pageHeadline !== undefined) updateData.pageHeadline = body.pageHeadline;
        if (body.pageSocialYouTube !== undefined) updateData.pageSocialYouTube = body.pageSocialYouTube;
        if (body.pageSocialFacebook !== undefined) updateData.pageSocialFacebook = body.pageSocialFacebook;
        if (body.pageSocialWhatsApp !== undefined) updateData.pageSocialWhatsApp = body.pageSocialWhatsApp;
        if (body.pageSocialInstagram !== undefined) updateData.pageSocialInstagram = body.pageSocialInstagram;
        if (body.pageSidePanelColor !== undefined) updateData.pageSidePanelColor = body.pageSidePanelColor;
        if (body.pageSelectedEventTypes !== undefined) updateData.pageSelectedEventTypes = body.pageSelectedEventTypes;
        if (body.pageImage !== undefined) updateData.pageImage = body.pageImage;
        if (body.pageSchedulerHeader !== undefined) updateData.pageSchedulerHeader = body.pageSchedulerHeader;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                username: true,
                name: true,
                avatar: true,
                logo: true,
                pageAboutMe: true,
                pageHeadline: true,
                pageSocialYouTube: true,
                pageSocialFacebook: true,
                pageSocialWhatsApp: true,
                pageSocialInstagram: true,
                pageSidePanelColor: true,
                pageSelectedEventTypes: true,
                pageImage: true,
                pageSchedulerHeader: true,
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('[PAGE_CONFIG_POST_ERROR]', error);
        return NextResponse.json({ error: 'Failed to save page configuration' }, { status: 500 });
    }
}
