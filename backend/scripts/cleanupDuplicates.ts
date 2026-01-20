import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanup() {
  console.log("Cleaning up duplicate room types...");

  // 1. Handle Matrimoniale (ID 2 and 5)
  // Keep ID 2, Move Rooms from 5 to 2, Delete 5
  try {
    const roomsToMoveM = await prisma.room.updateMany({
      where: { roomTypeId: 5 },
      data: { roomTypeId: 2 }
    });
    console.log(`Moved ${roomsToMoveM.count} rooms from Matrimoniale (5) to (2)`);
    
    // Check if any daily rates exist for type 5
    await prisma.dailyRate.deleteMany({ where: { roomTypeId: 5 } });
    
    await prisma.roomType.delete({
      where: { id: 5 }
    });
    console.log("Deleted Matrimoniale (5)");
  } catch (e) {
    console.error("Error handling Matrimoniale:", e);
  }

  // 2. Handle Singola (ID 3 and 7)
  // Keep ID 3, Move Rooms from 7 to 3, Delete 7
  try {
     const roomsToMoveS = await prisma.room.updateMany({
      where: { roomTypeId: 7 },
      data: { roomTypeId: 3 }
    });
    console.log(`Moved ${roomsToMoveS.count} rooms from Singola (7) to (3)`);
    
    await prisma.dailyRate.deleteMany({ where: { roomTypeId: 7 } });

    await prisma.roomType.delete({
      where: { id: 7 }
    });
    console.log("Deleted Singola (7)");
  } catch (e) {
    console.error("Error handling Singola:", e);
  }
}

cleanup()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
