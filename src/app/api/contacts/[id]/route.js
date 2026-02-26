import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { name, email, phone, company, fieldValues } = await request.json();
        const id = params.id;

        const contact = await prisma.contact.findFirst({
            where: { id, userId: session.user.id },
        });
        if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Update contact
        const updated = await prisma.contact.update({
            where: { id },
            data: {
                name: name !== undefined ? name : contact.name,
                email: email !== undefined ? email : contact.email,
                phone: phone !== undefined ? phone : contact.phone,
                company: company !== undefined ? company : contact.company,
            },
        });

        // Update field values
        if (fieldValues) {
            for (const fv of fieldValues) {
                if (fv.value?.trim()) {
                    await prisma.contactFieldValue.upsert({
                        where: { contactId_fieldId: { contactId: id, fieldId: fv.fieldId } },
                        create: { contactId: id, fieldId: fv.fieldId, value: fv.value },
                        update: { value: fv.value },
                    });
                } else {
                    await prisma.contactFieldValue.deleteMany({
                        where: { contactId: id, fieldId: fv.fieldId },
                    });
                }
            }
        }

        return NextResponse.json({ contact: updated });
    } catch (error) {
        console.error('Contact PUT error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await prisma.contact.findFirst({
            where: { id: params.id, userId: session.user.id },
        });
        if (!contact) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.contact.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
