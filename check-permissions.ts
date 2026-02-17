import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DUMPING ROLE PERMISSIONS MATRIX ---');
    const setting = await prisma.systemSettings.findUnique({
        where: { key: 'role_permissions_matrix' },
    });

    if (setting) {
        console.log(JSON.stringify(setting.value, null, 2));
    } else {
        console.log('Matrix not found in database.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
