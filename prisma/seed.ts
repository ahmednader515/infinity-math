import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!datasourceUrl) {
    throw new Error("Missing DIRECT_DATABASE_URL or DATABASE_URL environment variable.");
}

const prisma = new PrismaClient({
    datasourceUrl,
});

async function main() {
    console.log("Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 