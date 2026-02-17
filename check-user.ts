import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmll569ky000088d8h5vtliww';
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
    });
    console.log('User details:', user);

    const setting = await prisma.systemSettings.findUnique({
        where: { key: 'role_permissions_matrix' },
    });
    console.log('Role Permissions Matrix from DB:', JSON.stringify(setting?.value, null, 2));

    const teams = await prisma.team.findMany({
        where: { managerId: userId },
        include: { members: true }
    });
    console.log('Teams managed by user:', JSON.stringify(teams, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
