import { ethers } from 'ethers';
import { getGroupPool } from './contract'; // your getter that returns ethers.Contract (GroupPool)

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

export async function listUserGroupPaymentIds(
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0,
) {
  const gp = await getGroupPool(sp);
  const provider = ethers.Signer.isSigner(sp) ? (sp.provider as ethers.providers.Provider)! : sp;

  const latest = await provider.getBlockNumber();

  // PoolCreated(id, creator, token, recipient, target, deadline, metadata)
  const createdFilter = gp.filters.PoolCreated(null, user);
  // Contributed(id, from, amount, newTotal)
  const contribFilter = gp.filters.Contributed(null, user);

  const [createdLogs, contribLogs] = await Promise.all([
    getLogsChunked(provider, createdFilter, fromBlock, latest),
    getLogsChunked(provider, contribFilter, fromBlock, latest),
  ]);

  const created = new Set<number>();
  for (const log of createdLogs) {
    const parsed = gp.interface.parseLog(log);
    created.add(parsed.args.id.toNumber());
  }

  const participated = new Set<number>();
  for (const log of contribLogs) {
    const parsed = gp.interface.parseLog(log);
    const id = parsed.args.id.toNumber();
    if (!created.has(id)) participated.add(id);
  }

  return { created: [...created], participated: [...participated], all: [...new Set([...created, ...participated])] };
}

export async function getGroupPayment(
  sp: ethers.Signer | ethers.providers.Provider,
  id: number
) {
  const gp = await getGroupPool(sp);
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
}

export async function getUserGroupPayments(
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0
) {
  const ids = await listUserGroupPaymentIds(sp, user, fromBlock);
  const details = await Promise.all(ids.all.map((id) => getGroupPayment(sp, id)));
  // "Active" = not closed AND (deadline == 0 OR deadline >= now)
  const now = Math.floor(Date.now() / 1000);
  const active = details.filter((d) => !d.closed && (d.deadline === 0 || d.deadline >= now));
  return { active, all: details };
}

// Native token contribution
export async function contributeToGroupPayment(
  signer: ethers.Signer,
  id: number,
  amountEth: string
) {
  const gp = await getGroupPool(signer);
  // native path => amount argument is 0, value carries ETH
  const tx = await gp.contribute(id, 0, { value: ethers.utils.parseEther(amountEth) });
  return tx.wait();
}

// ERC-20 contribution
export async function contributeToGroupPaymentErc20(
  signer: ethers.Signer,
  id: number,
  token: string,           // ERC-20 address used when the pool was created
  amountEth: string
) {
  const gp = await getGroupPool(signer);
  const erc20 = new ethers.Contract(token, [
    'function approve(address spender, uint256 amount) external returns (bool)'
  ], signer);

  const amount = ethers.utils.parseEther(amountEth);
  const poolAddr = gp.address;

  await (await erc20.approve(poolAddr, amount)).wait();
  // ERC-20 path => amount argument is the token amount, value is 0
  await (await gp.contribute(id, amount, { value: 0 })).wait();
}
