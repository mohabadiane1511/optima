import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: "ESSENTIEL",
      name: "Essentiel",
      priceMonthlyFCFA: "5000",
      priceYearlyFCFA: "54000", // -10%
      includedUsers: 1,
      extraUserCreationFeeFCFA: "1500",
      extraUserMonthlyFeeFCFA: "500",
      modules: ["dashboard", "produits_stocks", "ventes", "etat_financier_pdf"],
      quotas: null,
    },
    {
      code: "CROISSANCE",
      name: "Croissance",
      priceMonthlyFCFA: "15000",
      priceYearlyFCFA: "150000", // -16.67%
      includedUsers: 3,
      extraUserCreationFeeFCFA: "1000",
      extraUserMonthlyFeeFCFA: "1000",
      modules: [
        "dashboard",
        "produits_stocks",
        "ventes",
        "achats",
        "etat_financier_pdf",
      ],
      quotas: null,
    },
    {
      code: "SERENITE",
      name: "Sérénité",
      priceMonthlyFCFA: "25000",
      priceYearlyFCFA: "250000", // -16.67%
      includedUsers: 5,
      extraUserCreationFeeFCFA: "1500",
      extraUserMonthlyFeeFCFA: "1000",
      modules: [
        "dashboard",
        "produits_stocks",
        "ventes",
        "achats",
        "caisses",
        "etat_financier_pdf",
      ],
      quotas: null,
    },
    {
      code: "PREMIUM",
      name: "Premium",
      priceMonthlyFCFA: "40000",
      priceYearlyFCFA: "400000", // -16.67%
      includedUsers: 10,
      extraUserCreationFeeFCFA: "2000",
      extraUserMonthlyFeeFCFA: "2000",
      modules: [
        "dashboard",
        "produits_stocks",
        "ventes",
        "achats",
        "caisses",
        "rh",
        "etat_financier_pdf",
      ],
      quotas: null,
    },
  ];

  for (const p of plans) {
    const created = await prisma.plan.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        priceMonthlyFCFA: p.priceMonthlyFCFA,
        priceYearlyFCFA: p.priceYearlyFCFA,
        includedUsers: p.includedUsers,
        extraUserCreationFeeFCFA: p.extraUserCreationFeeFCFA,
        extraUserMonthlyFeeFCFA: p.extraUserMonthlyFeeFCFA,
        modules: p.modules,
        quotas: p.quotas,
      },
      update: {
        name: p.name,
        priceMonthlyFCFA: p.priceMonthlyFCFA,
        priceYearlyFCFA: p.priceYearlyFCFA,
        includedUsers: p.includedUsers,
        extraUserCreationFeeFCFA: p.extraUserCreationFeeFCFA,
        extraUserMonthlyFeeFCFA: p.extraUserMonthlyFeeFCFA,
        modules: p.modules,
        quotas: p.quotas,
      },
    });
    console.log(`Plan upserted: ${created.code}`);
  }

  console.log("Plans seed completed ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
