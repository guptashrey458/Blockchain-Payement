import { ethers } from 'ethers';
import { getSavingsPot } from './contract';

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

export async function listUserPotIds(
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0,
) {
  const pot = await getSavingsPot(sp);
  const provider = ethers.Signer.isSigner(sp) ? (sp.provider as ethers.providers.Provider)! : sp;

  const latest = await provider.getBlockNumber();
  // PotCreated(id, owner, token, target)
  const createdFilter = pot.filters.PotCreated(null, user);

  const createdLogs = await getLogsChunked(provider, createdFilter, fromBlock, latest);
  const ids = new Set<number>();
  for (const log of createdLogs) {
    const parsed = pot.interface.parseLog(log);
    ids.add(parsed.args.id.toNumber());
  }
  return Array.from(ids);
}

export async function getPot(
  sp: ethers.Signer | ethers.providers.Provider,
  id: number
) {
  const c = await getSavingsPot(sp);
  const p = await c.pots(id);
  return {
    id,
    owner: p.owner as string,
    token: p.token as string,
    target: ethers.utils.formatEther(p.target),
    balance: ethers.utils.formatEther(p.balance),
    created: Number(p.created),
    closed: Boolean(p.closed),
  };
}

export async function getUserPots(
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0
) {
  const ids = await listUserPotIds(sp, user, fromBlock);
  const pots = await Promise.all(ids.map((id) => getPot(sp, id)));
  const active = pots.filter((p) => !p.closed);
  return { active, all: pots };
}

// Native token deposit
export async function depositToPot(
  signer: ethers.Signer,
  id: number,
  amountEth: string
) {
  const pot = await getSavingsPot(signer);
  // native path => amount argument is 0, value carries ETH
  const tx = await pot.deposit(id, 0, { value: ethers.utils.parseEther(amountEth) });
  return tx.wait();
}

// ERC-20 deposit
export async function depositToPotErc20(
  signer: ethers.Signer,
  id: number,
  token: string,
  amountEth: string
) {
  const pot = await getSavingsPot(signer);
  const erc20 = new ethers.Contract(token, [
    'function approve(address spender, uint256 amount) external returns (bool)'
  ], signer);

  const amount = ethers.utils.parseEther(amountEth);
  const potAddr = pot.address;

  await (await erc20.approve(potAddr, amount)).wait();
  // ERC-20 path => amount argument is the token amount, value is 0
  await (await pot.deposit(id, amount, { value: 0 })).wait();
}
