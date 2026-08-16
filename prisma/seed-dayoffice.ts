import { PrismaClient } from "@prisma/client";
import { EventStatus, PrizeStatus } from "../src/lib/types/enums";
import crypto from "crypto";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Lucas", "Ana", "Gabriel", "Beatriz", "Matheus", "Mariana", "Pedro", "Larissa",
  "Guilherme", "Camila", "Felipe", "Juliana", "Gustavo", "Fernanda", "Rafael", "Amanda",
  "Thiago", "Letícia", "Bruno", "Bruna", "Rodrigo", "Jéssica", "Leonardo", "Carolina",
  "Vinícius", "Natália", "Diego", "Isabela", "Eduardo", "Gabriela", "Vitor", "Bianca",
  "Marcelo", "Vanessa", "Alexandre", "Patrícia", "André", "Aline", "Fábio", "Renata",
  "Caio", "Luana", "Igor", "Priscila", "Renato", "Monique", "Henrique", "Tatiana",
  "Danilo", "Sabrina", "Arthur", "Helena", "Bernardo", "Alice", "Heitor", "Laura",
  "Davi", "Manuela", "Lorenzo", "Sophia", "Thales", "Clarice", "Samuel", "Lívia",
  "Enzo", "Cecília", "Murilo", "Maitê", "Cauã", "Lorena", "Luiz", "Yasmin",
  "Breno", "Isadora", "Erick", "Rebeca", "Otávio", "Lavínia", "Ruan", "Melissa",
  "Yuri", "Emanuelly", "Kaique", "Alícia", "Alan", "Agatha", "Calebe", "Ester",
  "Nicolas", "Joana", "Fernando", "Carla", "Ricardo", "Talita", "Leandro", "Viviane",
  "Cristiano", "Daniela", "Rogério", "Cláudia"
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
  "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
  "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
  "Gonçalves", "Santana", "Teixeira", "Cavalcanti", "Moraes", "Melo", "Pinto", "Castro"
];

const CATEGORIES = [
  "Aluno de Graduação",
  "Aluno de Graduação",
  "Aluno de Graduação",
  "Aluno de Pós-Graduação",
  "Professor / Docente",
  "Colaborador Administrativo",
  "Empreendedor Residente Day Office",
  "Pesquisador / Bolsista",
];

const PRIZES_DATA = [
  { name: "Cadeira Ergonômica Presidente Pro Reclinável", desc: "Apoio lombar ajustável 3D, revestimento mesh respirável e base de alumínio.", val: 1850.0 },
  { name: "Teclado Mecânico Sem Fio Logitech MX Mechanical", desc: "Switches táteis silenciosos, iluminação inteligente e conexão multi-dispositivo.", val: 950.0 },
  { name: "Mouse Ergonômico Logitech MX Master 3S", desc: "Sensor 8K DPI com rolagem MagSpeed eletromagnética e clique ultra silencioso.", val: 680.0 },
  { name: "Headset Bluetooth ANC Sony WH-1000XM4", desc: "Cancelamento de ruído líder de mercado e áudio premium de alta fidelidade.", val: 1490.0 },
  { name: "Monitor UltraWide LG 29\" IPS Full HD", desc: "Formato 21:9 com HDR10, 75Hz e divisão de telas para produtividade máxima.", val: 1250.0 },
  { name: "Kindle Paperwhite 16GB à Prova d'Água", desc: "Tela de 6,8\" com luz quente ajustável e semanas de duração de bateria.", val: 799.0 },
  { name: "Mesa Digitalizadora Wacom One Small", desc: "Sensibilidade de 4096 níveis de pressão com caneta ergonômica sem bateria.", val: 380.0 },
  { name: "Mochila Executiva Antifurto Impermeável", desc: "Compartimento acolchoado para notebook 15.6\", trava TSA e porta USB externa.", val: 320.0 },
  { name: "Carregador Portátil Power Bank 20.000mAh 65W", desc: "Carregamento ultra-rápido compatível com notebooks, tablets e smartphones.", val: 290.0 },
  { name: "Suporte Articulado a Gás para 2 Monitores", desc: "Pistão a gás com giro 360°, padrão VESA 75/100 e organizador de cabos.", val: 350.0 },
  { name: "Caixa de Som Bluetooth JBL Flip 6", desc: "À prova d'água IP67 com som estéreo potente e 12 horas de autonomia.", val: 649.0 },
  { name: "Hub USB-C 8 em 1 4K HDMI + Gigabit", desc: "Conexão HDMI 4K, 3x USB 3.0, leitor de cartões SD/TF e entrega de energia 100W.", val: 280.0 },
  { name: "Luminária de Mesa LED com Carregador por Indução", desc: "Controle touch de temperatura de cor, dimmer e base QI Wireless Fast.", val: 190.0 },
  { name: "Echo Dot 5ª Geração com Alexa", desc: "Smart speaker com som de alta qualidade e controle de rotinas de escritório.", val: 429.0 },
  { name: "Fone de Ouvido TWS Samsung Galaxy Buds FE", desc: "Cancelamento ativo de ruído, encaixe seguro e microfone com IA.", val: 449.0 },
  { name: "Fone de Ouvido TWS Edifier X3 Lite", desc: "Conexão Bluetooth 5.3 estável, baixa latência e 24h totais de bateria.", val: 199.0 },
  { name: "Webcam Full HD 1080p 60fps com Microfone Duplo", desc: "Foco automático rápido, correção de luz baixa e tampa de privacidade.", val: 280.0 },
  { name: "Suporte de Alumínio Articulado para Notebook", desc: "Design ergonômico dissipador de calor com ajuste de 6 níveis de altura.", val: 140.0 },
  { name: "Garrafa Térmica Inteligente com Sensor de Temperatura", desc: "Aço inox 304 com isolamento a vácuo e display digital em tempo real.", val: 180.0 },
  { name: "Mousepad Deskmat Extra Grande 90x40cm em Couro", desc: "Superfície suave e antiderrapante para teclado, mouse e laptop.", val: 120.0 },
  { name: "Vale-Compras Livraria Campus R$ 250", desc: "Válido para aquisição de livros acadêmicos, didáticos ou suprimentos.", val: 250.0 },
  { name: "Vale-Compras Livraria Campus R$ 200", desc: "Válido para compras de literatura científica e material de escritório.", val: 200.0 },
  { name: "Vale-Compras Livraria Campus R$ 150", desc: "Crédito direto na livraria oficial do campus UniFAP.", val: 150.0 },
  { name: "Vale-Compras Livraria Campus R$ 100 - Voucher A", desc: "Crédito de 100 reais para compras na Livraria Campus.", val: 100.0 },
  { name: "Vale-Compras Livraria Campus R$ 100 - Voucher B", desc: "Crédito de 100 reais para compras na Livraria Campus.", val: 100.0 },
  { name: "Assinatura Mensal Café Universitário VIP", desc: "Passaporte para cafés expressos, cappuccinos e lanches no centro de convivência.", val: 200.0 },
  { name: "Cartão Presente Café Universitário R$ 150", desc: "Voucher recarregável para consumo no Café Universitário.", val: 150.0 },
  { name: "Cartão Presente Café Universitário R$ 100", desc: "Voucher exclusivo para pausa de café e networking no campus.", val: 100.0 },
  { name: "Cartão Presente Café Universitário R$ 100 - Extra", desc: "Voucher exclusivo para consumo no espaço de convivência.", val: 100.0 },
  { name: "Cartão Presente Café Universitário R$ 50", desc: "Voucher para expressos gourmet e delícias artesanais.", val: 50.0 },
  { name: "Licença Anual JetBrains All Products Pack", desc: "Acesso completo a IntelliJ, WebStorm, PyCharm, DataGrip e ferramentas Pro.", val: 1600.0 },
  { name: "Assinatura Anual Alura / Coursera Plus", desc: "Mais de 1.400 cursos de programação, inteligência artificial, gestão e design.", val: 1200.0 },
  { name: "Curso Avançado de Inteligência Artificial & LLMs", desc: "Certificação em Engenharia de Prompt, RAG e automação de fluxos com IA.", val: 500.0 },
  { name: "Mentoria Executiva de Carreira & Negócios 1:1", desc: "Duas sessões estratégicas com especialistas em inovação e startups.", val: 600.0 },
  { name: "Kit Produtividade Day Office (Moleskine + Caneta Rollerball)", desc: "Caderno pautado capa dura em couro ecológico e caneta executiva pesada.", val: 220.0 },
  { name: "Kit Day Office Tech Organizer", desc: "Pendrive 128GB USB 3.2 SanDisk, organizador de cabos e estojo rígido.", val: 160.0 },
  { name: "Smartband Xiaomi Smart Band 8", desc: "Monitoramento contínuo de passos, frequência cardíaca, sono e 150 modos de treino.", val: 279.0 },
  { name: "Apoio Ergonômico para Pés com Ajuste Angular", desc: "Base antiderrapante com rolamento de massagem para alívio de postura.", val: 150.0 },
  { name: "Apoio de Pulso em Gel Ortopédico para Teclado e Mouse", desc: "Espuma viscoelástica de memória que previne LER/DORT no dia a dia.", val: 90.0 },
  { name: "Carregador Turbo Baseus GaN 65W Triplo", desc: "2x USB-C + 1x USB-A com tecnologia GaN 5 Pro de tamanho compacto.", val: 190.0 },
  { name: "SSD Externo Portátil Kingston 1TB USB 3.2", desc: "Leitura de até 1.050MB/s em formato compacto de bolso anti-queda.", val: 580.0 },
  { name: "Tripé Articulado com Ring Light 10\" para Reuniões", desc: "Iluminação ajustável para videochamadas, aulas online e apresentações.", val: 170.0 },
  { name: "Mini Difusor & Umidificador Ultrassônico de Mesa", desc: "Iluminação RGB suave e operação silenciosa para ambiente de trabalho agradável.", val: 110.0 },
  { name: "Copo Térmico Arell 420ml com Tampa e Abridor", desc: "Isolamento térmico a vácuo com parede dupla em aço 18/8.", val: 130.0 },
  { name: "Organizador de Mesa em Madeira Maciça com Dock", desc: "Espaço dedicado para celular, fone de ouvido, canetas e cartões de visita.", val: 140.0 },
  { name: "Kit 3 Livros: 'Sprint', 'O Estilo Startup' e 'Essencialismo'", desc: "Trilogia indispensável para metodologias ágeis, inovação e alta performance.", val: 180.0 },
  { name: "Vale-Presente Amazon R$ 200", desc: "Válido para milhões de produtos na loja online da Amazon Brasil.", val: 200.0 },
  { name: "Vale-Presente Amazon R$ 150", desc: "Cartão digital pré-pago para compras de produtos ou e-books.", val: 150.0 },
  { name: "Gift Card Pré-pago Serviços Digitais R$ 180", desc: "Válido para assinaturas de streaming, games ou softwares.", val: 180.0 },
  { name: "🌟 Troféu Destaque & Super Kit Especial Day Office 2026", desc: "Grande Prêmio de Encerramento: Troféu em acrílico UniFAP + Combo Supremo de Tecnologia!", val: 800.0 },
];

async function main() {
  console.log("🚀 Iniciando criação do evento de demonstração: Day Office UniFAP 2026...");

  // 1. Check or retrieve sponsors
  let sponsors = await prisma.sponsor.findMany({});
  if (sponsors.length === 0) {
    const sp1 = await prisma.sponsor.create({
      data: {
        name: "TechParaíso Inovação",
        logoUrl: "/sponsors/tech-paraiso.svg",
        description: "Empresa de tecnologia parceira e incubada no ecossistema UniFAP.",
      },
    });
    const sp2 = await prisma.sponsor.create({
      data: {
        name: "Livraria Campus",
        logoUrl: "/sponsors/livraria-campus.svg",
        description: "Livros acadêmicos, didáticos e suprimentos para estudantes.",
      },
    });
    const sp3 = await prisma.sponsor.create({
      data: {
        name: "Café Universitário",
        logoUrl: "/sponsors/cafe-universitario.svg",
        description: "Espaço de convivência oficial no campus UniFAP.",
      },
    });
    sponsors = [sp1, sp2, sp3];
  }

  // 2. Create or find Day Office sponsor
  let dayOfficeSponsor = await prisma.sponsor.findFirst({
    where: { name: "Day Office Coworking & Inovação" },
  });
  if (!dayOfficeSponsor) {
    dayOfficeSponsor = await prisma.sponsor.create({
      data: {
        name: "Day Office Coworking & Inovação",
        logoUrl: "/sponsors/tech-paraiso.svg",
        description: "Hub de inovação, coworking e desenvolvimento profissional acelerado.",
        website: "https://unifapce.edu.br",
        email: "dayoffice@unifapce.edu.br",
        phone: "(88) 3512-4000",
      },
    });
    sponsors.push(dayOfficeSponsor);
  }

  // 3. Check if existing day office event exists, delete old one if needed to make clean
  const existingSlug = "day-office-unifap-2026";
  const oldEvent = await prisma.event.findUnique({
    where: { slug: existingSlug },
  });

  if (oldEvent) {
    console.log("♻️ Removendo versão anterior do evento Day Office para recriação limpa...");
    await prisma.event.delete({
      where: { id: oldEvent.id },
    });
  }

  // 4. Create Event: Day Office UniFAP 2026
  const presentationToken = "dayoffice-presentation-" + crypto.randomBytes(8).toString("hex");

  const event = await prisma.event.create({
    data: {
      name: "Day Office UniFAP 2026 — Maratona de Inovação & Sorteios",
      slug: existingSlug,
      description: "Evento institucional de produtividade, empreendedorismo e premiações exclusivas para alunos, professores e parceiros do Day Office UniFAP.",
      date: new Date("2026-10-15T18:30:00Z"),
      time: "18:30",
      location: "Espaço Coworking & Auditório Maker — UniFAP Juazeiro do Norte",
      logoUrl: "/branding/unifap-logo.svg",
      status: EventStatus.ACTIVE,
      primaryColor: "#002B49",
      secondaryColor: "#EAA023",
      allowRepeatWinners: false,
      maxParticipants: 200,
      presentationToken: presentationToken,
      theme: {
        create: {
          heroTitle: "Day Office UniFAP 2026 — Grande Premiação",
          heroSubtitle: "Reconhecendo a dedicação, inovação e excelência da nossa comunidade acadêmica",
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

  console.log(`✅ Evento criado: "${event.name}" (ID: ${event.id})`);
  console.log(`🔑 Token do Telão: ${presentationToken}`);

  // 5. Create 50 Prizes
  console.log("🎁 Cadastrando 50 prêmios exclusivos...");
  const prizePromises = PRIZES_DATA.map((p, idx) => {
    // Select sponsor logically
    let sponsorId = sponsors[0].id;
    if (p.name.includes("Livraria")) {
      const liv = sponsors.find((s) => s.name.includes("Livraria"));
      if (liv) sponsorId = liv.id;
    } else if (p.name.includes("Café")) {
      const caf = sponsors.find((s) => s.name.includes("Café"));
      if (caf) sponsorId = caf.id;
    } else if (dayOfficeSponsor) {
      sponsorId = dayOfficeSponsor.id;
    }

    return prisma.prize.create({
      data: {
        eventId: event.id,
        sponsorId: sponsorId,
        name: p.name,
        description: p.desc,
        quantity: 1,
        estimatedValue: p.val,
        order: idx + 1,
        status: PrizeStatus.AVAILABLE,
      },
    });
  });

  const createdPrizes = await Promise.all(prizePromises);
  console.log(`✅ ${createdPrizes.length} prêmios cadastrados com sucesso.`);

  // 6. Generate 100 Unique Realistic Participants
  console.log("👥 Cadastrando 100 participantes (Bilhetes #1 a #100)...");
  
  const participantsData: any[] = [];
  for (let i = 1; i <= 100; i++) {
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName1 = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const lastName2 = LAST_NAMES[(i * 7 + 1) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName1} ${lastName2}`;
    
    const ticketNumber = i;
    const matriculaNumber = 20260000 + i;
    const registration = `MAT-${matriculaNumber}`;
    
    // Generate valid formatted CPF masked
    const cpfDigits = String(10000000000 + (i * 123456789) % 89999999999);
    const emailName = `${firstName.toLowerCase()}.${lastName1.toLowerCase()}${i}`;
    const email = `${emailName}@aluno.unifapce.edu.br`;
    const phone = `(88) 9${Math.floor(8000 + Math.random() * 1999)}-${Math.floor(1000 + Math.random() * 8999)}`;
    const category = CATEGORIES[i % CATEGORIES.length];

    participantsData.push({
      eventId: event.id,
      name: fullName,
      ticketNumber: ticketNumber,
      registration: registration,
      cpf: cpfDigits,
      email: email,
      phone: phone,
      category: category,
      status: "ACTIVE",
      isEligible: true,
      isWinner: false,
    });
  }

  // Insert in batch
  await prisma.participant.createMany({
    data: participantsData,
  });

  console.log(`✅ 100 participantes inseridos com bilhetes numerados de 1 a 100.`);

  console.log("\n=======================================================");
  console.log("🎉 EVENTO DAY OFFICE PRONTO PARA DEMONSTRAÇÃO E TESTES!");
  console.log("=======================================================");
  console.log(`📌 ID do Evento: ${event.id}`);
  console.log(`📌 Slug do Evento: ${event.slug}`);
  console.log(`📌 Painel de Sorteio (Operador): http://localhost:3000/admin/events/${event.id}/draw`);
  console.log(`📌 Gerenciamento de Prêmios: http://localhost:3000/admin/events/${event.id}/prizes`);
  console.log(`📌 Lista de Participantes: http://localhost:3000/admin/events/${event.id}/participants`);
  console.log(`📌 Telão de Apresentação 4K: http://localhost:3000/presentation/${event.id}?token=${presentationToken}`);
  console.log(`📌 Página Pública de Inscrição: http://localhost:3000/public/event/${event.slug}`);
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao rodar seed do Day Office:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
