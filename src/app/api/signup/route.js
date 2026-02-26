import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, password, timezone } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email and password are required' },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already in use' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const username = name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);

        // Ensure unique username
        let finalUsername = username;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
            finalUsername = `${username}-${counter}`;
            counter++;
        }

        // Generate verification token
        const verificationToken = crypto.randomUUID();

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                username: finalUsername,
                timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                emailVerified: false,
                verificationToken,
            },
        });

        // Create default schedule with Mon-Fri 9-5
        await prisma.schedule.create({
            data: {
                name: 'Working Hours',
                isDefault: true,
                userId: user.id,
                availabilities: {
                    create: [
                        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                    ],
                },
            },
        });

        // Create default event type
        await prisma.eventType.create({
            data: {
                title: '30 Minute Meeting',
                slug: '30-minute-meeting',
                description: 'A quick 30-minute catch-up',
                duration: 30,
                type: 'one-on-one',
                color: '#ff9500',
                userId: user.id,
            },
        });

        // Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verifyUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;
        await sendVerificationEmail({ email, name, verifyUrl });

        return NextResponse.json(
            { message: 'Account created! Please check your email to verify your account.', needsVerification: true },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 }
        );
    }
}
