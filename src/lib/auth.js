import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter email and password');
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    throw new Error('No user found with this email');
                }

                if (user.authProvider === 'google') {
                    throw new Error('This account uses Google sign-in. Please click "Continue with Google" instead.');
                }

                if (!user.password) {
                    throw new Error('Invalid login method for this account');
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error('Invalid password');
                }

                if (!user.emailVerified) {
                    throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    timezone: user.timezone,
                    brandColor: user.brandColor,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    // Check if user already exists
                    let dbUser = await prisma.user.findUnique({
                        where: { email: user.email },
                    });

                    if (dbUser) {
                        // If user exists but signed up with credentials, link accounts
                        if (dbUser.authProvider === 'credentials') {
                            await prisma.user.update({
                                where: { id: dbUser.id },
                                data: {
                                    authProvider: 'google',
                                    emailVerified: true,
                                    avatar: user.image || dbUser.avatar,
                                },
                            });
                        }
                        // Continue to invitation check below
                    } else {
                        // Create new user from Google profile
                        const name = user.name || 'User';
                        let username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

                        // Ensure unique username
                        let finalUsername = username;
                        let counter = 1;
                        while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
                            finalUsername = `${username}${counter}`;
                            counter++;
                        }

                        // Create the user
                        await prisma.user.create({
                            data: {
                                name,
                                email: user.email,
                                username: finalUsername,
                                authProvider: 'google',
                                emailVerified: true,
                                avatar: user.image || null,
                                timezone: 'Asia/Kolkata',
                                schedules: {
                                    create: {
                                        name: 'Working Hours',
                                        isDefault: true,
                                        availabilities: {
                                            create: [1, 2, 3, 4, 5].map((day) => ({
                                                dayOfWeek: day,
                                                startTime: '09:00',
                                                endTime: '17:00',
                                            })),
                                        },
                                    },
                                },
                            },
                        });
                    }

                    // Continue to invitation check below
                } catch (error) {
                    console.error('[GOOGLE_SIGNIN_ERROR]', error);
                    return false;
                }
            }

            // After any successful sign-in, auto-accept pending invitations
            if (user?.email) {
                try {
                    const pendingInvitations = await prisma.invitation.findMany({
                        where: { email: user.email, status: 'pending' },
                    });

                    for (const invitation of pendingInvitations) {
                        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
                        if (!dbUser) continue;

                        // Check if already a team member
                        const existingMember = await prisma.teamMember.findFirst({
                            where: { teamId: invitation.teamId, userId: dbUser.id },
                        });

                        if (!existingMember) {
                            await prisma.teamMember.create({
                                data: {
                                    teamId: invitation.teamId,
                                    userId: dbUser.id,
                                    role: invitation.role || 'member',
                                },
                            });
                        }

                        await prisma.invitation.update({
                            where: { id: invitation.id },
                            data: { status: 'accepted' },
                        });

                        console.log(`[AUTH] Auto-accepted invitation for ${user.email} to team ${invitation.teamId}`);
                    }
                } catch (invErr) {
                    console.error('[AUTH] Error auto-accepting invitations:', invErr);
                }
            }

            return true;
        },
        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.timezone = user.timezone;
                token.brandColor = user.brandColor;
            }

            if (trigger === 'update' && session) {
                if (session.name) token.name = session.name;
                if (session.timezone) token.timezone = session.timezone;
                if (session.brandColor) token.brandColor = session.brandColor;
            }

            // Sync with DB if needed (only for Google or periodically)
            if (account?.provider === 'google' || !token.username) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.username = dbUser.username;
                    token.timezone = dbUser.timezone;
                    token.brandColor = dbUser.brandColor;
                    token.name = dbUser.name;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.timezone = token.timezone;
                session.user.brandColor = token.brandColor;
                session.user.name = token.name;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || 'super-secret-key-change-in-production',
};

export default NextAuth(authOptions);
