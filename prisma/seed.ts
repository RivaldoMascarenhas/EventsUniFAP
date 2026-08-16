import { PrismaClient } from "@prisma/client";
import { Role, EventStatus, PrizeStatus, DrawType, AuditAction } from "../src/lib/types/enums";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o seed do UniFAP Sorteios...");

  // 1. Clean existing seed data safely if any
  await prisma.winner.deleteMany({});
  await prisma.draw.deleteMany({});
  await prisma.participant.deleteMany({});
  await prisma.prize.deleteMany({});
  await prisma.soundConfig.deleteMany({});
  await prisma.eventTheme.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.sponsor.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Users (Admin, Operator, Presenter)
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("Admin123!", salt);
  const operatorPasswordHash = await bcrypt.hash("Operador123!", salt);
  const presenterPasswordHash = await bcrypt.hash("Presenter123!", salt);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador Institucional UniFAP",
      email: "admin@unifap.local",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: "Operador de Eventos UniFAP",
      email: "operador@unifap.local",
      passwordHash: operatorPasswordHash,
      role: Role.OPERATOR,
    },
  });

  await prisma.user.create({
    data: {
      name: "Apresentador de Palco",
      email: "apresentador@unifap.local",
      passwordHash: presenterPasswordHash,
      role: Role.PRESENTER,
    },
  });

  console.log("✅ Usuários criados com sucesso (Admin, Operador, Apresentador)");

  // 3. Sponsors
  const sponsorTech = await prisma.sponsor.create({
    data: {
      name: "TechParaíso Inovação",
      logoUrl: "/sponsors/tech-paraiso.svg",
      description: "Empresa de tecnologia parceira e incubada no ecossistema UniFAP.",
      website: "https://unifapce.edu.br",
      email: "contato@techparaiso.com.br",
      phone: "(88) 3512-0000",
    },
  });

  const sponsorLivraria = await prisma.sponsor.create({
    data: {
      name: "Livraria Campus",
      logoUrl: "/sponsors/livraria-campus.svg",
      description: "Livros acadêmicos, materiais didáticos e suprimentos para estudantes.",
      website: "https://unifapce.edu.br",
      email: "livraria@campus.com.br",
      phone: "(88) 3512-1111",
    },
  });

  const sponsorCafe = await prisma.sponsor.create({
    data: {
      name: "Café Universitário",
      logoUrl: "/sponsors/cafe-universitario.svg",
      description: "Espaço de convivência oficial no centro de convivência do campus.",
      website: "https://unifapce.edu.br",
      email: "cafe@unifapce.edu.br",
      phone: "(88) 3512-2222",
    },
  });

  console.log("✅ 3 Patrocinadores criados");

  // 4. Main Event: Semana Acadêmica UniFAP 2026
  const event = await prisma.event.create({
    data: {
      name: "Semana Acadêmica UniFAP 2026",
      slug: "semana-academica-unifap-2026",
      description: "Maior evento institucional de tecnologia, inovação, saúde e extensão do Centro Universitário Paraíso.",
      date: new Date("2026-09-20T19:00:00Z"),
      time: "19:00",
      location: "Auditório Principal - Campus UniFAP Juazeiro do Norte",
      logoUrl: "/branding/unifap-logo.svg",
      status: EventStatus.ACTIVE,
      primaryColor: "#002B49",
      secondaryColor: "#EAA023",
      allowRepeatWinners: false,
      maxParticipants: 1000,
      theme: {
        create: {
          heroTitle: "Grande Sorteio Institucional UniFAP 2026",
          heroSubtitle: "Transformando o conhecimento e premiando o talento acadêmico",
          backgroundPattern: "modern-mesh",
        },
      },
      soundConfig: {
        create: {
          soundEnabled: true,
          volume: 0.8,
          soundPreset: "institutional",
        },
      },
    },
  });

  console.log("✅ Evento 'Semana Acadêmica UniFAP 2026' criado");

  // 5. Prizes
  const prize1 = await prisma.prize.create({
    data: {
      eventId: event.id,
      sponsorId: sponsorTech.id,
      name: "Notebook Dell Inspiron 15 i5 16GB SSD 512GB",
      description: "Notebook de alta performance para estudos, desenvolvimento e projetos acadêmicos.",
      quantity: 1,
      estimatedValue: 4499.0,
      order: 1,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const prize2 = await prisma.prize.create({
    data: {
      eventId: event.id,
      sponsorId: sponsorTech.id,
      name: "Tablet Samsung Galaxy Tab S9 FE com Caneta S-Pen",
      description: "Ideal para leitura de artigos, anotações de aulas e produtividade digital.",
      quantity: 1,
      estimatedValue: 2799.0,
      order: 2,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const prize3 = await prisma.prize.create({
    data: {
      eventId: event.id,
      sponsorId: sponsorLivraria.id,
      name: "Kindle Paperwhite 16GB com Iluminação Embutida",
      description: "Leitor digital para biblioteca técnica e acervo científico.",
      quantity: 1,
      estimatedValue: 799.0,
      order: 3,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const prize4 = await prisma.prize.create({
    data: {
      eventId: event.id,
      sponsorId: sponsorLivraria.id,
      name: "Kit Mochila Executiva UniFAP + Brindes Acadêmicos",
      description: "Mochila antifurto reforçada com itens exclusivos da marca UniFAP.",
      quantity: 1,
      estimatedValue: 450.0,
      order: 4,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const prize5 = await prisma.prize.create({
    data: {
      eventId: event.id,
      sponsorId: sponsorCafe.id,
      name: "Voucher Semestral Cafeteria UniFAP R$ 300",
      description: "Consumo livre no Café Universitário do campus para todo o semestre letivo.",
      quantity: 1,
      estimatedValue: 300.0,
      order: 5,
      status: PrizeStatus.DRAWN, // Sample drawn prize
    },
  });

  console.log("✅ 5 Prêmios cadastrados");

  // 6. Participants
  const participantsData = [
    { name: "Lucas Mendonça de Alencar", registration: "202310101", cpf: "08412345678", email: "lucas.mendonca@aluno.unifapce.edu.br", phone: "(88) 99871-0001", category: "Sistemas de Informação", ticketNumber: 101 },
    { name: "Mariana Costa Cavalcante", registration: "202310102", cpf: "07523456789", email: "mariana.costa@aluno.unifapce.edu.br", phone: "(88) 99871-0002", category: "Direito", ticketNumber: 102 },
    { name: "Gabriel Sampaio Ferreira", registration: "202310103", cpf: "09634567890", email: "gabriel.sampaio@aluno.unifapce.edu.br", phone: "(88) 99871-0003", category: "Engenharia Civil", ticketNumber: 103 },
    { name: "Beatriz Oliveira dos Santos", registration: "202310104", cpf: "05745678901", email: "beatriz.oliveira@aluno.unifapce.edu.br", phone: "(88) 99871-0004", category: "Psicologia", ticketNumber: 104 },
    { name: "Rodrigo Vasconcelos Lima", registration: "202310105", cpf: "04856789012", email: "rodrigo.lima@aluno.unifapce.edu.br", phone: "(88) 99871-0005", category: "Administração", ticketNumber: 105 },
    { name: "Camila Nogueira Barreto", registration: "202310106", cpf: "03967890123", email: "camila.nogueira@aluno.unifapce.edu.br", phone: "(88) 99871-0006", category: "Arquitetura e Urbanismo", ticketNumber: 106 },
    { name: "Thiago Medeiros Peixoto", registration: "202310107", cpf: "02078901234", email: "thiago.medeiros@aluno.unifapce.edu.br", phone: "(88) 99871-0007", category: "Sistemas de Informação", ticketNumber: 107 },
    { name: "Juliana Bezerra Araripe", registration: "202310108", cpf: "01189012345", email: "juliana.araripe@aluno.unifapce.edu.br", phone: "(88) 99871-0008", category: "Fisioterapia", ticketNumber: 108 },
    { name: "Felipe Macedo Grangeiro", registration: "202310109", cpf: "09290123456", email: "felipe.macedo@aluno.unifapce.edu.br", phone: "(88) 99871-0009", category: "Odontologia", ticketNumber: 109 },
    { name: "Ana Clara Pinheiro Duarte", registration: "202310110", cpf: "08301234567", email: "anaclara.duarte@aluno.unifapce.edu.br", phone: "(88) 99871-0010", category: "Nutrição", ticketNumber: 110 },
    { name: "Vinicius Tavares Gondim", registration: "202310111", cpf: "07412345670", email: "vinicius.tavares@aluno.unifapce.edu.br", phone: "(88) 99871-0011", category: "Biomedicina", ticketNumber: 111 },
    { name: "Leticia Albuquerque Teles", registration: "202310112", cpf: "06523456781", email: "leticia.teles@aluno.unifapce.edu.br", phone: "(88) 99871-0012", category: "Enfermagem", ticketNumber: 112 },
    { name: "Matheus Correia Feitosa", registration: "202310113", cpf: "05634567892", email: "matheus.feitosa@aluno.unifapce.edu.br", phone: "(88) 99871-0013", category: "Engenharia de Produção", ticketNumber: 113 },
    { name: "Larissa Holanda Fontes", registration: "202310114", cpf: "04745678903", email: "larissa.fontes@aluno.unifapce.edu.br", phone: "(88) 99871-0014", category: "Direito", ticketNumber: 114 },
    { name: "Rafael Brito Guimarães", registration: "202310115", cpf: "03856789014", email: "rafael.brito@aluno.unifapce.edu.br", phone: "(88) 99871-0015", category: "Sistemas de Informação", ticketNumber: 115 },
  ];

  const createdParticipants = [];
  for (const p of participantsData) {
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        name: p.name,
        registration: p.registration,
        cpf: p.cpf,
        email: p.email,
        phone: p.phone,
        category: p.category,
        ticketNumber: p.ticketNumber,
        isEligible: true,
        isWinner: p.ticketNumber === 104, // Participant 104 won prize 5
      },
    });
    createdParticipants.push(participant);
  }

  console.log(`✅ ${createdParticipants.length} Participantes cadastrados`);

  // 7. Sample Initial Draw & Winner for Demonstration
  const sampleWinnerParticipant = createdParticipants.find((p) => p.ticketNumber === 104)!;

  const sampleDraw = await prisma.draw.create({
    data: {
      eventId: event.id,
      prizeId: prize5.id,
      drawType: DrawType.NUMBER,
      winnerParticipantId: sampleWinnerParticipant.id,
      drawnNumber: sampleWinnerParticipant.ticketNumber,
      drawnName: sampleWinnerParticipant.name,
      operatorId: operator.id,
      notes: "Sorteio inaugural de abertura da Semana Acadêmica",
    },
  });

  await prisma.winner.create({
    data: {
      eventId: event.id,
      prizeId: prize5.id,
      participantId: sampleWinnerParticipant.id,
      drawId: sampleDraw.id,
      drawDate: new Date(),
    },
  });

  // 8. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: AuditAction.EVENT_CREATED,
      entity: "Event",
      entityId: event.id,
      metadata: JSON.stringify({ name: "Semana Acadêmica UniFAP 2026" }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: operator.id,
      action: AuditAction.DRAW_COMPLETED,
      entity: "Draw",
      entityId: sampleDraw.id,
      metadata: JSON.stringify({
        prize: prize5.name,
        winner: sampleWinnerParticipant.name,
        ticketNumber: sampleWinnerParticipant.ticketNumber,
      }),
    },
  });

  console.log("\n🎉 SEED CONCLUÍDO COM SUCESSO!");
  console.log("==================================================");
  console.log("Credenciais de Desenvolvimento (APENAS PARA DEV):");
  console.log("👉 Administrador: admin@unifap.local / Admin123!");
  console.log("👉 Operador:      operador@unifap.local / Operador123!");
  console.log("👉 Apresentador:  apresentador@unifap.local / Presenter123!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
