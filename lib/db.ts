import { PrismaClient as PrismaClientNode } from "@prisma/client";
import { PrismaClient as PrismaClientEdge } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientInstance | undefined;
};

const isEdgeRuntime = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== "undefined";

function createPrismaClient() {
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
    const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;

    if (accelerateUrl) {
        return new PrismaClientEdge({
            datasourceUrl: accelerateUrl,
        }).$extends(withAccelerate());
    }

    if (isEdgeRuntime) {
        throw new Error("PRISMA_ACCELERATE_URL must be set in Edge runtimes.");
    }

    const datasourceUrl = directDatabaseUrl ?? databaseUrl;

    if (!datasourceUrl) {
        throw new Error("Missing DATABASE_URL or DIRECT_DATABASE_URL environment variable.");
    }

    return new PrismaClientNode({
        datasources: {
            db: { url: datasourceUrl },
        },
    });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isEdgeRuntime && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}