import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function resolveSeedPassword(): string {
    const explicitPassword = process.env.SEED_DEFAULT_PASSWORD?.trim();
    if (explicitPassword) {
        if (explicitPassword.length < 12) {
            throw new Error('SEED_DEFAULT_PASSWORD must have at least 12 characters.');
        }
        return explicitPassword;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('SEED_DEFAULT_PASSWORD is required in production.');
    }

    return 'admin123';
}

async function main() {
    console.log('Seeding database...');

    // 1. Create default users
    const seedPassword = resolveSeedPassword();
    const hashedPassword = await bcrypt.hash(seedPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@hiperfarma.com.br' },
        update: {},
        create: {
            email: 'admin@hiperfarma.com.br',
            name: 'Administrador',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            password: hashedPassword,
            phone: '(41) 99999-0001',
            department: 'TI',
        },
    });
    console.log('  ok Admin user:', admin.email);

    const sdr = await prisma.user.upsert({
        where: { email: 'sdr@hiperfarma.com.br' },
        update: {},
        create: {
            email: 'sdr@hiperfarma.com.br',
            name: 'Maria Silva',
            role: UserRole.SDR,
            status: UserStatus.ACTIVE,
            password: hashedPassword,
            phone: '(41) 99999-0002',
            department: 'Expansao',
        },
    });
    console.log('  ok SDR user:', sdr.email);

    const consultant = await prisma.user.upsert({
        where: { email: 'consultor@hiperfarma.com.br' },
        update: {},
        create: {
            email: 'consultor@hiperfarma.com.br',
            name: 'Carlos Santos',
            role: UserRole.CONSULTANT,
            status: UserStatus.ACTIVE,
            password: hashedPassword,
            phone: '(41) 99999-0003',
            department: 'Expansao',
        },
    });
    console.log('  ok Consultant user:', consultant.email);

    // 2. Create association pricing
    const pricing = await prisma.associationPricing.upsert({
        where: { id: 'pricing-2026' },
        update: {
            isActive: true,
            marketingMonthly: 2500.0,
            adminMonthly: 1800.0,
            totalMonthly: 4300.0,
        },
        create: {
            id: 'pricing-2026',
            name: 'Tabela 2026',
            effectiveDate: new Date('2026-01-01'),
            isActive: true,
            marketingMonthly: 2500.0,
            marketingDescription:
                '- Campanhas institucionais\n- Materiais de divulgacao\n- Acoes de relacionamento\n- Publicidade compartilhada',
            adminMonthly: 1800.0,
            adminDescription:
                '- Gestao e governanca\n- Suporte tecnico\n- Sistemas e ferramentas\n- Consultorias especializadas',
            totalMonthly: 4300.0,
            createdBy: admin.id,
        },
    });
    console.log('  ok Pricing:', pricing.name, '- R$', pricing.totalMonthly.toString(), '/mes');

    // 3. Create default pipeline
    const pipeline = await prisma.pipeline.upsert({
        where: { id: 'pipeline-default' },
        update: {},
        create: {
            id: 'pipeline-default',
            name: 'Funil de Expansao',
            description: 'Pipeline padrao para novos associados',
            isDefault: true,
            isActive: true,
        },
    });

    const stages = [
        { id: 'stage-1', name: 'Leads Novos', color: '#EAB308', order: 1 },
        { id: 'stage-2', name: 'Call Agendada', color: '#3B82F6', order: 2 },
        { id: 'stage-3', name: 'Aguardando Call', color: '#6366F1', order: 3 },
        { id: 'stage-4', name: 'Call Realizada', color: '#F59E0B', order: 4 },
        { id: 'stage-5', name: 'Proposta Enviada', color: '#F97316', order: 5 },
        { id: 'stage-6', name: 'Em Decisao', color: '#8B5CF6', order: 6 },
        { id: 'stage-7', name: 'Fechado', color: '#22C55E', order: 7, isWon: true },
        { id: 'stage-8', name: 'Sem Fit', color: '#6B7280', order: 8, isLost: true },
    ];

    for (const stage of stages) {
        await prisma.pipelineStage.upsert({
            where: { id: stage.id },
            update: { name: stage.name, color: stage.color, order: stage.order },
            create: {
                id: stage.id,
                pipelineId: pipeline.id,
                name: stage.name,
                color: stage.color,
                order: stage.order,
                isWon: stage.isWon || false,
                isLost: stage.isLost || false,
            },
        });
    }
    console.log('  ok Pipeline com', stages.length, 'etapas');

    console.log('');
    console.log('Seed completed.');
    console.log('');
    console.log('Login credentials:');
    console.log('   Admin: admin@hiperfarma.com.br / <SEED_DEFAULT_PASSWORD>');
    console.log('   SDR:   sdr@hiperfarma.com.br / <SEED_DEFAULT_PASSWORD>');
}

main()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
