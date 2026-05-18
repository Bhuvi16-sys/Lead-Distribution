import { prisma } from './prisma';

const MANDATORY_PROVIDERS: Record<string, string[]> = {
  'Service 1': ['Provider 1'],
  'Service 2': ['Provider 5'],
  'Service 3': ['Provider 1', 'Provider 4'],
};

const FAIR_POOLS: Record<string, string[]> = {
  'Service 1': ['Provider 2', 'Provider 3', 'Provider 4'],
  'Service 2': ['Provider 6', 'Provider 7', 'Provider 8'],
  'Service 3': ['Provider 2', 'Provider 3', 'Provider 5', 'Provider 6', 'Provider 7', 'Provider 8'],
};

export async function processLeadAssignment(leadId: string, serviceId: string, serviceName: string) {
  let assignedCount = 0;
  
  // CONCURRENCY HANDLING: We use a Prisma interactive transaction with Serializable isolation.
  // This guarantees that if multiple leads are processed at the exact same millisecond, 
  // they will queue and process sequentially, preventing quota overages or race conditions on the allocation pointer.
  await prisma.$transaction(async (tx) => {
    const mandatoryNames = MANDATORY_PROVIDERS[serviceName] || [];
    const poolNames = FAIR_POOLS[serviceName] || [];

    // Fetch relevant providers (in a real high-scale system, we would use raw SQL `SELECT ... FOR UPDATE` here)
    const allRelevantNames = [...new Set([...mandatoryNames, ...poolNames])];
    const providers = await tx.provider.findMany({
      where: { name: { in: allRelevantNames } },
    });

    const providerMap = new Map(providers.map(p => [p.name, p]));
    const assignedProviderIds: string[] = [];

    // 1. Assign to mandatory providers first (if quota allows)
    for (const mName of mandatoryNames) {
      const p = providerMap.get(mName);
      if (p && p.leadsReceived < p.quota && assignedProviderIds.length < 3) {
        assignedProviderIds.push(p.id);
        p.leadsReceived += 1;
      }
    }

    // 2. Fair Distribution for remaining slots (Round-Robin)
    if (assignedProviderIds.length < 3 && poolNames.length > 0) {
      let allocState = await tx.allocationState.findUnique({ where: { serviceId } });
      
      if (!allocState) {
        allocState = await tx.allocationState.create({
          data: { serviceId, lastProviderIndex: 0 },
        });
      }

      let currentIndex = allocState.lastProviderIndex;
      const originalIndex = currentIndex;
      let loopedOnce = false;

      while (assignedProviderIds.length < 3 && !loopedOnce) {
        currentIndex = (currentIndex + 1) % poolNames.length;
        if (currentIndex === originalIndex) {
          loopedOnce = true; // We've checked the entire pool
        }

        const candidateName = poolNames[currentIndex];
        const candidate = providerMap.get(candidateName);

        // Verify provider exists, has quota, and hasn't already been assigned via the mandatory step
        if (
          candidate &&
          candidate.leadsReceived < candidate.quota &&
          !assignedProviderIds.includes(candidate.id)
        ) {
          assignedProviderIds.push(candidate.id);
          candidate.leadsReceived += 1;
          loopedOnce = false; // Reset loop detection to continue searching if we still need more providers
        }
      }

      // Persist the pointer so fair distribution survives server restarts
      await tx.allocationState.update({
        where: { id: allocState.id },
        data: { lastProviderIndex: currentIndex },
      });
    }

    // 3. Commit assignments and update quotas
    if (assignedProviderIds.length > 0) {
      await tx.leadAssignment.createMany({
        data: assignedProviderIds.map(pid => ({ leadId, providerId: pid })),
      });

      for (const pid of assignedProviderIds) {
        await tx.provider.update({
          where: { id: pid },
          data: { leadsReceived: { increment: 1 } },
        });
      }
    }
    
    assignedCount = assignedProviderIds.length;
  }, {
    isolationLevel: 'Serializable', // Strictest concurrency handling
    maxWait: 5000,
    timeout: 10000,
  });

  // REAL-TIME: Fire event to notify dashboard SSE stream
  if (assignedCount > 0) {
    import('./events').then(({ eventEmitter }) => {
      eventEmitter.emit('new_lead_assignment');
    });
  }

  return assignedCount;
}
