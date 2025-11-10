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

    if (isEdgeRuntime) {
        if (!accelerateUrl) {
            throw new Error("PRISMA_ACCELERATE_URL must be set in Edge runtimes.");
        }

        return new PrismaClientEdge({
            datasourceUrl: accelerateUrl,
        }).$extends(withAccelerate());
    }

    const datasourceUrl = accelerateUrl ?? directDatabaseUrl ?? databaseUrl;

    if (!datasourceUrl) {
        throw new Error("Missing DATABASE_URL, DIRECT_DATABASE_URL, or PRISMA_ACCELERATE_URL environment variable.");
    }

    const client = new PrismaClientNode({
        datasourceUrl,
    });

    return accelerateUrl ? client.$extends(withAccelerate()) : client;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!isEdgeRuntime && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}