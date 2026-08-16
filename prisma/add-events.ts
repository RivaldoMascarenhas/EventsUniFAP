import { PrismaClient } from "@prisma/client";
import { Role, EventStatus, PrizeStatus, DrawType, AuditAction } from "../src/lib/types/enums";
import crypto from "crypto";

const prisma = new PrismaClient();

async function addMoreEvents() {
  console.log("🚀 Cadastrando novos eventos no UniFAP Sorteios...");

  // Get Admin user for audit and ownership
  const admin = await prisma.user.findUnique({ where: { email: "admin@unifap.local" } });
  const adminId = admin?.id;

  // Get Sponsors
  const sponsors = await prisma.sponsor.findMany();
  const techSponsor = sponsors.find((s) => s.name.includes("TechParaíso")) || sponsors[0];
  const bookSponsor = sponsors.find((s) => s.name.includes("Livraria")) || sponsors[1] || sponsors[0];
  const cafeSponsor = sponsors.find((s) => s.name.includes("Café")) || sponsors[2] || sponsors[0];

  // ----------------------------------------------------
  // EVENT 1: Jornada de Tecnologia & Inovação UniFAP 2026
  // ----------------------------------------------------
  const event1 = await prisma.event.upsert({
    where: { slug: "jornada-ti-unifap-2026" },
    update: {},
    create: {
      name: "Jornada de Tecnologia & Inovação UniFAP 2026",
      slug: "jornada-ti-unifap-2026",
      description: "Grande encontro acadêmico reunindo estudantes e profissionais de TI com palestras, workshops e premiações especiais.",
      date: new Date("2026-09-18T19:00:00Z"),
      time: "19:00",
      location: "Auditório Principal — Campus Juazeiro do Norte",
      status: EventStatus.ACTIVE,
      primaryColor: "#002B49",
      secondaryColor: "#EAA023",
      allowRepeatWinners: false,
      presentationToken: crypto.randomBytes(24).toString("hex"),
      theme: {
        create: {
          heroTitle: "Jornada Tech UniFAP 2026",
          heroSubtitle: "Inovação, Inteligência Artificial e o Futuro da Tecnologia",
          backgroundPattern: "modern-mesh",
        },
      },
      soundConfig: {
        create: {
          soundEnabled: true,
          volume: 0.9,
          soundPreset: "institutional",
        },
      },
    },
  });

  // Prizes for Event 1
  const p1 = await prisma.prize.create({
    data: {
      eventId: event1.id,
      sponsorId: techSponsor.id,
      name: "Monitor Gamer LG UltraWide 29'' FHD",
      description: "Monitor UltraWide com HDR10, 75Hz e proporção 21:9 para produtividade e código.",
      quantity: 1,
      estimatedValue: 1299.0,
      order: 1,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const p2 = await prisma.prize.create({
    data: {
      eventId: event1.id,
      sponsorId: techSponsor.id,
      name: "Smart Speaker Alexa Echo Dot 5ª Geração",
      description: "Assistente virtual com áudio aprimorado e controle inteligente.",
      quantity: 1,
      estimatedValue: 429.0,
      order: 2,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const p3 = await prisma.prize.create({
    data: {
      eventId: event1.id,
      sponsorId: techSponsor.id,
      name: "Teclado Mecânico RGB Redragon Kumara",
      description: "Teclado mecânico gamer padrão ABNT2 com switches tácteis.",
      quantity: 1,
      estimatedValue: 250.0,
      order: 3,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const p4 = await prisma.prize.create({
    data: {
      eventId: event1.id,
      name: "Kit Mochila Executiva + Garrafa Térmica UniFAP",
      description: "Kit premium institucional exclusivo para estudantes de destaque.",
      quantity: 1,
      estimatedValue: 180.0,
      order: 4,
      status: PrizeStatus.AVAILABLE,
    },
  });

  // Participants for Event 1
  const tiParticipants = [
    { name: "Gabriel Siqueira Vasconcelos", cpf: "067.891.234-11", registration: "202320101", email: "gabriel.vasconcelos@aluno.unifapce.edu.br", phone: "(88) 99712-0001", cat: "Engenharia de Software" },
    { name: "Larissa Menezes Cavalcante", cpf: "078.912.345-22", registration: "202320102", email: "larissa.menezes@aluno.unifapce.edu.br", phone: "(88) 99712-0002", cat: "Ciência da Computação" },
    { name: "Matheus Vinícius Alencar", cpf: "089.123.456-33", registration: "202320103", email: "matheus.alencar@aluno.unifapce.edu.br", phone: "(88) 99712-0003", cat: "Análise e Des. de Sistemas" },
    { name: "Bianca Duarte Figueiredo", cpf: "090.234.567-44", registration: "202320104", email: "bianca.figueiredo@aluno.unifapce.edu.br", phone: "(88) 99712-0004", cat: "Engenharia de Software" },
    { name: "Rodrigo Barreto Fontes", cpf: "012.345.678-55", registration: "202320105", email: "rodrigo.fontes@aluno.unifapce.edu.br", phone: "(88) 99712-0005", cat: "Sistemas de Informação" },
    { name: "Camila Aragão Pinheiro", cpf: "023.456.789-66", registration: "202320106", email: "camila.pinheiro@aluno.unifapce.edu.br", phone: "(88) 99712-0006", cat: "Engenharia de Software" },
    { name: "Vinicius Nogueira Parente", cpf: "034.567.890-77", registration: "202320107", email: "vinicius.parente@aluno.unifapce.edu.br", phone: "(88) 99712-0007", cat: "Ciência da Computação" },
    { name: "Isabela Farias Gondim", cpf: "045.678.901-88", registration: "202320108", email: "isabela.gondim@aluno.unifapce.edu.br", phone: "(88) 99712-0008", cat: "Análise e Des. de Sistemas" },
    { name: "Diego Bezerra Albuquerque", cpf: "056.789.012-99", registration: "202320109", email: "diego.bezerra@aluno.unifapce.edu.br", phone: "(88) 99712-0009", cat: "Engenharia de Software" },
    { name: "Fernanda Lacerda Braga", cpf: "067.890.123-00", registration: "202320110", email: "fernanda.braga@aluno.unifapce.edu.br", phone: "(88) 99712-0010", cat: "Sistemas de Informação" },
    { name: "Thiago Ramos Mendonça", cpf: "078.901.234-12", registration: "202320111", email: "thiago.mendonca@aluno.unifapce.edu.br", phone: "(88) 99712-0011", cat: "Ciência da Computação" },
    { name: "Juliana Frota Lustosa", cpf: "089.012.345-23", registration: "202320112", email: "juliana.lustosa@aluno.unifapce.edu.br", phone: "(88) 99712-0012", cat: "Engenharia de Software" },
  ];

  let ticket1 = 101;
  for (const part of tiParticipants) {
    await prisma.participant.create({
      data: {
        eventId: event1.id,
        name: part.name,
        cpf: part.cpf,
        registration: part.registration,
        email: part.email,
        phone: part.phone,
        category: part.cat,
        ticketNumber: ticket1++,
        isEligible: true,
        isWinner: false,
      },
    });
  }

  // ----------------------------------------------------
  // EVENT 2: Congresso de Saúde & Bem-Estar UniFAP 2026
  // ----------------------------------------------------
  const event2 = await prisma.event.upsert({
    where: { slug: "congresso-saude-unifap-2026" },
    update: {},
    create: {
      name: "Congresso de Saúde & Bem-Estar UniFAP 2026",
      slug: "congresso-saude-unifap-2026",
      description: "Congresso multiprofissional com foco em inovação clínica, fisioterapia, enfermagem e biomedicina.",
      date: new Date("2026-10-05T08:30:00Z"),
      time: "08:30",
      location: "Bloco C — Sala de Conferências UniFAP",
      status: EventStatus.ACTIVE,
      primaryColor: "#002B49",
      secondaryColor: "#0080C8",
      allowRepeatWinners: false,
      presentationToken: crypto.randomBytes(24).toString("hex"),
      theme: {
        create: {
          heroTitle: "Congresso de Saúde UniFAP",
          heroSubtitle: "Cuidado Integrado e Novas Fronteiras da Saúde",
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

  // Prizes for Event 2
  await prisma.prize.create({
    data: {
      eventId: event2.id,
      sponsorId: bookSponsor.id,
      name: "Apple iPad 9ª Geração 64GB Wi-Fi",
      description: "Tablet para estudos anatômicos e leitura de artigos científicos.",
      quantity: 1,
      estimatedValue: 2499.0,
      order: 1,
      status: PrizeStatus.AVAILABLE,
    },
  });

  await prisma.prize.create({
    data: {
      eventId: event2.id,
      sponsorId: bookSponsor.id,
      name: "Estetoscópio Littmann Classic III 3M",
      description: "Estetoscópio profissional de alta sensibilidade acústica.",
      quantity: 1,
      estimatedValue: 680.0,
      order: 2,
      status: PrizeStatus.AVAILABLE,
    },
  });

  await prisma.prize.create({
    data: {
      eventId: event2.id,
      sponsorId: bookSponsor.id,
      name: "Vale-Livros Técnicos R$ 250,00 Livraria Campus",
      description: "Voucher para compra de atlas e livros universitários.",
      quantity: 1,
      estimatedValue: 250.0,
      order: 3,
      status: PrizeStatus.AVAILABLE,
    },
  });

  // Participants for Event 2
  const saudeParticipants = [
    { name: "Ana Clara Medeiros Dantas", cpf: "091.234.567-89", registration: "202310201", email: "ana.dantas@aluno.unifapce.edu.br", phone: "(88) 99823-1001", cat: "Fisioterapia" },
    { name: "Lucas Henrique Araripe", cpf: "092.345.678-90", registration: "202310202", email: "lucas.araripe@aluno.unifapce.edu.br", phone: "(88) 99823-1002", cat: "Enfermagem" },
    { name: "Beatriz Holanda Queiroz", cpf: "093.456.789-01", registration: "202310203", email: "beatriz.queiroz@aluno.unifapce.edu.br", phone: "(88) 99823-1003", cat: "Biomedicina" },
    { name: "Renan Macedo Feitosa", cpf: "094.567.890-12", registration: "202310204", email: "renan.feitosa@aluno.unifapce.edu.br", phone: "(88) 99823-1004", cat: "Fisioterapia" },
    { name: "Letícia Peixoto Teles", cpf: "095.678.901-23", registration: "202310205", email: "leticia.teles@aluno.unifapce.edu.br", phone: "(88) 99823-1005", cat: "Nutrição" },
    { name: "Guilherme Furtado Prado", cpf: "096.789.012-34", registration: "202310206", email: "guilherme.prado@aluno.unifapce.edu.br", phone: "(88) 99823-1006", cat: "Enfermagem" },
    { name: "Sara Vilarim Gusmão", cpf: "097.890.123-45", registration: "202310207", email: "sara.gusmao@aluno.unifapce.edu.br", phone: "(88) 99823-1007", cat: "Biomedicina" },
    { name: "Arthur Sales Montenegro", cpf: "098.901.234-56", registration: "202310208", email: "arthur.montenegro@aluno.unifapce.edu.br", phone: "(88) 99823-1008", cat: "Fisioterapia" },
  ];

  let ticket2 = 201;
  for (const part of saudeParticipants) {
    await prisma.participant.create({
      data: {
        eventId: event2.id,
        name: part.name,
        cpf: part.cpf,
        registration: part.registration,
        email: part.email,
        phone: part.phone,
        category: part.cat,
        ticketNumber: ticket2++,
        isEligible: true,
        isWinner: false,
      },
    });
  }

  // ----------------------------------------------------
  // EVENT 3: Fórum Jurídico do Cariri 2026 (SCHEDULED)
  // ----------------------------------------------------
  const event3 = await prisma.event.upsert({
    where: { slug: "forum-juridico-cariri-2026" },
    update: {},
    create: {
      name: "Fórum Jurídico do Cariri 2026",
      slug: "forum-juridico-cariri-2026",
      description: "Debates contemporâneos sobre Direito Digital, LGPD, Inteligência Artificial e a Nova Prática Forense.",
      date: new Date("2026-11-12T18:00:00Z"),
      time: "18:00",
      location: "Salão Nobre UniFAP — Campus Juazeiro do Norte",
      status: EventStatus.SCHEDULED,
      primaryColor: "#002B49",
      secondaryColor: "#EAA023",
      allowRepeatWinners: false,
      presentationToken: crypto.randomBytes(24).toString("hex"),
      theme: {
        create: {
          heroTitle: "Fórum Jurídico 2026",
          heroSubtitle: "Direito, Tecnologia e Ética no Século XXI",
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

  await prisma.prize.create({
    data: {
      eventId: event3.id,
      sponsorId: bookSponsor.id,
      name: "Coleção Vade Mecum Saraiva 2026 + Curso de Prática",
      description: "Edição atualizada completa para estudantes e advogados.",
      quantity: 1,
      estimatedValue: 450.0,
      order: 1,
      status: PrizeStatus.AVAILABLE,
    },
  });

  await prisma.prize.create({
    data: {
      eventId: event3.id,
      sponsorId: cafeSponsor.id,
      name: "Cartão Fidelidade Café Universitário (R$ 150)",
      description: "Voucher para consumo no Café Universitário Paraíso.",
      quantity: 1,
      estimatedValue: 150.0,
      order: 2,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const direitoParticipants = [
    { name: "Mariana Alencar Sampaio", cpf: "071.123.456-78", registration: "202310301", email: "mariana.sampaio@aluno.unifapce.edu.br", phone: "(88) 99654-2001", cat: "Direito" },
    { name: "Pedro Henrique Valença", cpf: "072.234.567-89", registration: "202310302", email: "pedro.valenca@aluno.unifapce.edu.br", phone: "(88) 99654-2002", cat: "Direito" },
    { name: "Vitória Régia Linhares", cpf: "073.345.678-90", registration: "202310303", email: "vitoria.linhares@aluno.unifapce.edu.br", phone: "(88) 99654-2003", cat: "Direito" },
    { name: "João Marcelo Albuquerque", cpf: "074.456.789-01", registration: "202310304", email: "joao.albuquerque@aluno.unifapce.edu.br", phone: "(88) 99654-2004", cat: "Direito" },
    { name: "Cecília Muniz Barreto", cpf: "075.567.890-12", registration: "202310305", email: "cecilia.muniz@aluno.unifapce.edu.br", phone: "(88) 99654-2005", cat: "Direito" },
  ];

  let ticket3 = 301;
  for (const part of direitoParticipants) {
    await prisma.participant.create({
      data: {
        eventId: event3.id,
        name: part.name,
        cpf: part.cpf,
        registration: part.registration,
        email: part.email,
        phone: part.phone,
        category: part.cat,
        ticketNumber: ticket3++,
        isEligible: true,
        isWinner: false,
      },
    });
  }

  // ----------------------------------------------------
  // EVENT 4: Feira de Carreiras & Empreendedorismo UniFAP
  // ----------------------------------------------------
  const event4 = await prisma.event.upsert({
    where: { slug: "feira-carreiras-unifap-2026" },
    update: {},
    create: {
      name: "Feira de Carreiras & Empreendedorismo UniFAP 2026",
      slug: "feira-carreiras-unifap-2026",
      description: "Conexão direta entre estudantes, empresas parceiras e oportunidades de estágio e trainees no Ceará.",
      date: new Date("2026-11-28T10:00:00Z"),
      time: "10:00",
      location: "Pátio Central do Campus UniFAP",
      status: EventStatus.ACTIVE,
      primaryColor: "#002B49",
      secondaryColor: "#EAA023",
      allowRepeatWinners: false,
      presentationToken: crypto.randomBytes(24).toString("hex"),
      theme: {
        create: {
          heroTitle: "Feira de Carreiras UniFAP",
          heroSubtitle: "Conectando Talentos a Grandes Oportunidades",
          backgroundPattern: "modern-mesh",
        },
      },
      soundConfig: {
        create: {
          soundEnabled: true,
          volume: 0.85,
          soundPreset: "institutional",
        },
      },
    },
  });

  await prisma.prize.create({
    data: {
      eventId: event4.id,
      sponsorId: techSponsor.id,
      name: "Smartphone Samsung Galaxy A55 5G 128GB",
      description: "Smartphone com câmera de alta resolução e processador octa-core.",
      quantity: 1,
      estimatedValue: 1899.0,
      order: 1,
      status: PrizeStatus.AVAILABLE,
    },
  });

  await prisma.prize.create({
    data: {
      eventId: event4.id,
      sponsorId: cafeSponsor.id,
      name: "Vale-Compras Cafeteria Campus (R$ 200,00)",
      description: "Voucher especial de alimentação e cafés gourmet.",
      quantity: 1,
      estimatedValue: 200.0,
      order: 2,
      status: PrizeStatus.AVAILABLE,
    },
  });

  const carreirasParticipants = [
    { name: "Lucas Moura Vianna", cpf: "081.111.222-33", registration: "202310401", email: "lucas.vianna@aluno.unifapce.edu.br", phone: "(88) 99543-3001", cat: "Administração" },
    { name: "Juliana Paiva Sobral", cpf: "082.222.333-44", registration: "202310402", email: "juliana.sobral@aluno.unifapce.edu.br", phone: "(88) 99543-3002", cat: "Ciências Contábeis" },
    { name: "Marcos Vinicius Queiroz", cpf: "083.333.444-55", registration: "202310403", email: "marcos.queiroz@aluno.unifapce.edu.br", phone: "(88) 99543-3003", cat: "Engenharia Civil" },
    { name: "Carolina Esteves Ramos", cpf: "084.444.555-66", registration: "202310404", email: "carolina.ramos@aluno.unifapce.edu.br", phone: "(88) 99543-3004", cat: "Psicologia" },
    { name: "Felipe Damasceno Cruz", cpf: "085.555.666-77", registration: "202310405", email: "felipe.cruz@aluno.unifapce.edu.br", phone: "(88) 99543-3005", cat: "Arquitetura e Urbanismo" },
    { name: "Thais Medeiros Silveira", cpf: "086.666.777-88", registration: "202310406", email: "thais.silveira@aluno.unifapce.edu.br", phone: "(88) 99543-3006", cat: "Administração" },
  ];

  let ticket4 = 401;
  for (const part of carreirasParticipants) {
    await prisma.participant.create({
      data: {
        eventId: event4.id,
        name: part.name,
        cpf: part.cpf,
        registration: part.registration,
        email: part.email,
        phone: part.phone,
        category: part.cat,
        ticketNumber: ticket4++,
        isEligible: true,
        isWinner: false,
      },
    });
  }

  console.log("✨ Todos os 4 novos eventos institucionais foram cadastrados com prêmios e participantes!");
}

addMoreEvents()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
