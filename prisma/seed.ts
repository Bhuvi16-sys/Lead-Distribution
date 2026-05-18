import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Seed Services
  const services = ['Service 1', 'Service 2', 'Service 3']
  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s },
      update: {},
      create: { name: s },
    })
  }

  // Seed Providers (1 to 8)
  for (let i = 1; i <= 8; i++) {
    const pName = `Provider ${i}`
    await prisma.provider.upsert({
      where: { name: pName },
      update: { quota: 10 },
      create: { name: pName, quota: 10 },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
