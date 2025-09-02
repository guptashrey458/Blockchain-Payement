import { ethers } from 'ethers';
import { getGroupPool } from '@/utils/contract';

async function getLogsChunked(
  provider: ethers.providers.Provider,
  base: ethers.providers.Filter,
  fromBlock: number,
  toBlock: number,
  step = 50_000,
) {
  const out: ethers.providers.Log[] = [];
  for (let start = fromBlock; start <= toBlock; start = Math.min(start + step, toBlock) + 1) {
    const end = Math.min(start + step, toBlock);
    const logs = await provider.getLogs({ ...base, fromBlock: start, toBlock: end });
    out.push(...logs);
  }
  return out;
}

/** Returns { active, all } for the sidebar + history. */
export async function getUserGroupPayments(
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0,                        // ideally set to your deployment block
) {
  const gp = await getGroupPool(sp);
  const provider = ethers.Signer.isSigner(sp) ? (sp.provider as ethers.providers.Provider)! : sp;

  const latest = await provider.getBlockNumber();

  const createdLogs = await getLogsChunked(
    provider,
    gp.filters.PoolCreated(null, user),
    fromBlock,
    latest,
  );

  const ids: number[] = [];
  for (const log of createdLogs) {
    const ev = gp.interface.parseLog(log);
    ids.push(ev.args.id.toNumber());
  }

  const details = await Promise.all(
    ids.map(async (id) => {
      const p = await gp.pools(id);
      return {
        id,
        creator: p.creator as string,
        token: p.token as string,
        recipient: p.recipient as string,
        target: ethers.utils.formatEther(p.target),
        total: ethers.utils.formatEther(p.total),
        deadline: Number(p.deadline),
        closed: Boolean(p.closed),
      };
    })
  );

  const now = Math.floor(Date.now()/1000);
  const active = details.filter((d) => !d.closed && (d.deadline === 0 || d.deadline >= now));
  return { active, all: details.sort((a, b) => b.id - a.id) };
}
