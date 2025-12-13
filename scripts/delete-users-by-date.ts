import { PrismaClient } from '@prisma/client';

const datasourceUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!datasourceUrl) {
    throw new Error("Missing DIRECT_DATABASE_URL or DATABASE_URL environment variable.");
}

const prisma = new PrismaClient({
    datasourceUrl,
});

async function deleteUsersByDate() {
  try {
    // Target date: December 13, 2025
    // Time range: 10PM (22:00) to 11:59:59 PM (23:59:59) Egypt time (UTC+2)
    // Egypt is UTC+2, so we need to subtract 2 hours to convert to UTC
    const targetDate = new Date('2025-12-13');
    
    // Egypt time: 10PM = 22:00 EET = 20:00 UTC
    const startTime = new Date(targetDate);
    startTime.setUTCHours(20, 0, 0, 0); // 10PM Egypt time = 20:00 UTC
    
    // Egypt time: 11:59:59 PM = 23:59:59 EET = 21:59:59 UTC
    const endTime = new Date(targetDate);
    endTime.setUTCHours(21, 59, 59, 999); // 11:59:59 PM Egypt time = 21:59:59 UTC

    console.log('🔍 Searching for users created on:', targetDate.toISOString().split('T')[0]);
    console.log('🌍 Timezone: Egypt (EET, UTC+2)');
    console.log('⏰ Time range: 10:00 PM to 11:59:59 PM (Egypt time)');
    console.log('📅 UTC range:', startTime.toISOString(), 'to', endTime.toISOString());
    console.log('📅 Egypt time range:', 
      new Date(startTime.getTime() + 2 * 60 * 60 * 1000).toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      'to',
      new Date(endTime.getTime() + 2 * 60 * 60 * 1000).toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
    );

    // First, count how many users will be deleted
    const userCount = await prisma.user.count({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    if (userCount === 0) {
      console.log('✅ No users found for the specified date.');
      return;
    }

    console.log(`⚠️  Found ${userCount} user(s) to delete.`);
    console.log('🗑️  Deleting users...');

    // Get user details before deletion for logging
    const usersToDelete = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    // Log users that will be deleted
    console.log('\n📋 Users to be deleted:');
    usersToDelete.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.phoneNumber}) - Role: ${user.role} - Created: ${user.createdAt.toISOString()}`);
    });

    // Delete users (cascading deletes will handle related records)
    const deleteResult = await prisma.user.deleteMany({
      where: {
        createdAt: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    console.log(`\n✅ Successfully deleted ${deleteResult.count} user(s).`);
    console.log('✅ Related records (purchases, progress, quiz results, etc.) have been automatically deleted due to cascade rules.');

  } catch (error) {
    console.error('❌ Error deleting users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteUsersByDate()
  .then(() => {
    console.log('\n✨ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

