// src/utils/contract.ts
import { ethers } from 'ethers'
import { getDeployment } from './deployments'
import { decodeRecipient } from './recipient'

/* ------------------------------ 1) ABIs (min) ----------------------------- */
/** UsernameRegistry */
const ABI_UsernameRegistry = [
  'function register(string name) external',
  'function transfer(string name, address to) external',
  'function setPrimary(string name) external',
  'function resolve(string name) external view returns (address)',
  'function ownerOf(bytes32) external view returns (address)',
  'function primaryOf(address) external view returns (bytes32)',
  'event Registered(bytes32 indexed nameHash, string name, address indexed owner)',
  'event Transferred(bytes32 indexed nameHash, address indexed from, address indexed to)',
  'event PrimarySet(address indexed user, bytes32 indexed nameHash)',
]

/** ProtectedEscrow */
const ABI_ProtectedEscrow = [
  'function createTransfer(address token,uint256 amount,uint8 rtype,bytes32 recipient,uint64 expiry,bytes32 hashlock,string note) payable returns (uint256 id)',
  'function claim(uint256 id) external',
  'function claimBySecret(uint256 id, bytes preimage, address recipient) external',
  'function refund(uint256 id) external',
  'function transfers(uint256) external view returns (address sender,address token,uint256 amount,uint64 expiry,bytes32 recipient,uint8 rtype,bytes32 hashlock,bool claimed)',
  'function nextId() external view returns (uint256)',
  'event TransferCreated(uint256 indexed id,address indexed sender,address token,uint256 amount,uint8 rtype,bytes32 recipient,uint64 expiry,bytes32 hashlock,string note)',
  'event Claimed(uint256 indexed id,address indexed to)',
  'event Refunded(uint256 indexed id,address indexed to)',
]

/** GroupPool */
const ABI_GroupPool = [
  'function createPool(address token,address recipient,uint256 target,uint64 deadline,string metadata) returns (uint256 id)',
  'function contribute(uint256 id,uint256 amount) payable',
  'function cancel(uint256 id)',
  'function refund(uint256 id)',
  'function pools(uint256) external view returns (address creator,address token,address recipient,uint256 target,uint256 total,uint64 deadline,bool closed)',
  'function contributions(uint256,address) external view returns (uint256)',
  'function nextPoolId() external view returns (uint256)',
  'event PoolCreated(uint256 indexed id,address indexed creator,address token,address recipient,uint256 target,uint64 deadline,string metadata)',
  'event Contributed(uint256 indexed id,address indexed from,uint256 amount,uint256 newTotal)',
  'event Distributed(uint256 indexed id,address indexed recipient,uint256 amount)',
  'event Refunded(uint256 indexed id,address indexed to,uint256 amount)',
  'event Cancelled(uint256 indexed id)',
]

/** SavingsPot */
const ABI_SavingsPot = [
  'function setAdapter(address adapter) external',
  'function createPot(address token,uint256 target) returns (uint256 id)',
  'function deposit(uint256 id,uint256 amount) payable',
  'function withdraw(uint256 id,uint256 amount,address to)',
  'function close(uint256 id)',
  'function pots(uint256) external view returns (address owner,address token,uint256 target,uint256 balance,uint64 created,bool closed)',
  'function nextPotId() external view returns (uint256)',
  'event PotCreated(uint256 indexed id,address indexed owner,address token,uint256 target)',
  'event Deposited(uint256 indexed id,address indexed from,uint256 amount,uint256 newBalance)',
  'event Withdrawn(uint256 indexed id,address indexed to,uint256 amount,uint256 newBalance)',
  'event Closed(uint256 indexed id)',
  'event AdapterSet(address indexed adapter)',
]

/* ------------------------- 2) Core helpers (generic) ---------------------- */
type SignerOrProvider = ethers.Signer | ethers.providers.Provider

const NATIVE = ethers.constants.AddressZero

const assertDeployedCode = async (provider: ethers.providers.Provider, address: string) => {
  const code = await provider.getCode(address)
  if (!code || code === '0x') throw new Error(`No bytecode at ${address}. Wrong chain or not deployed.`)
}

export const getChainId = async (sp: SignerOrProvider) => {
  if (ethers.Signer.isSigner(sp)) return sp.getChainId()
  const net = await sp.getNetwork()
  return net.chainId
}

// get addresses from your JSON loader (no hardcoded map anymore)
export const getAddressesFor = async (sp: SignerOrProvider) => {
  const chainIdBN = await getChainId(sp)
  const chainId = Number(chainIdBN)
  const d = getDeployment(chainId)
  return {
    UsernameRegistry: d.UsernameRegistry,
    ProtectedEscrow: d.ProtectedEscrow,
    GroupPool: d.GroupPool,
    SavingsPot: d.SavingsPot,
  }
}

const getContract = async <T extends ethers.Contract>(
  sp: SignerOrProvider,
  address: string,
  abi: any
): Promise<T> => {
  const provider = ethers.Signer.isSigner(sp) ? sp.provider! : sp
  await assertDeployedCode(provider, address)
  return new ethers.Contract(address, abi, sp as any) as T
}

/* --------------------------- 3) Contract getters -------------------------- */
export const getUsernameRegistry = async (sp: SignerOrProvider) => {
  const { UsernameRegistry } = await getAddressesFor(sp)
  return getContract(sp, UsernameRegistry, ABI_UsernameRegistry)
}
export const getProtectedEscrow = async (sp: SignerOrProvider) => {
  const { ProtectedEscrow } = await getAddressesFor(sp)
  return getContract(sp, ProtectedEscrow, ABI_ProtectedEscrow)
}
export const getGroupPool = async (sp: SignerOrProvider) => {
  const { GroupPool } = await getAddressesFor(sp)
  return getContract(sp, GroupPool, ABI_GroupPool)
}
export const getSavingsPot = async (sp: SignerOrProvider) => {
  const { SavingsPot } = await getAddressesFor(sp)
  return getContract(sp, SavingsPot, ABI_SavingsPot)
}

/* ------------------------------ 4) Registry -------------------------------- */
export const registerUsername = async (signer: ethers.Signer, name: string) => {
  const reg = await getUsernameRegistry(signer)
  const tx = await reg.register(name)
  return tx.wait()
}
export const resolveUsername = async (sp: SignerOrProvider, name: string) => {
  const reg = await getUsernameRegistry(sp)
  return reg.resolve(name)
}

/* ------------------------------ 5) Escrow ---------------------------------- */
// rtype: 0 = Address, 1 = Username
export const createTransferToAddress = async (
  signer: ethers.Signer,
  recipient: string,
  amountETH: string,
  opts?: { expiry?: number; note?: string; secret?: string; token?: string }
) => {
  const escrow = await getProtectedEscrow(signer)
  const token = opts?.token ?? NATIVE
  const expiry = opts?.expiry ?? 0
  const note = opts?.note ?? ''
  const hashlock = opts?.secret ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(opts.secret)) : ethers.constants.HashZero
  const recipientBytes32 = ethers.utils.hexZeroPad(recipient, 32)

  const value = ethers.utils.parseEther(amountETH)
  const tx = await escrow.createTransfer(
    token,
    value,
    0,
    recipientBytes32 as any,
    expiry,
    hashlock,
    note,
    { value: token === NATIVE ? value : 0 }
  )
  return tx.wait()
}

export const createTransferToUsername = async (
  signer: ethers.Signer,
  username: string,
  amountETH: string,
  opts?: { expiry?: number; note?: string; secret?: string; token?: string }
) => {
  const escrow = await getProtectedEscrow(signer)
  const token = opts?.token ?? NATIVE
  const expiry = opts?.expiry ?? 0
  const note = opts?.note ?? ''
  const hashlock = opts?.secret ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(opts.secret)) : ethers.constants.HashZero
  const recipientHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(username.toLowerCase()))

  const value = ethers.utils.parseEther(amountETH)
  const tx = await escrow.createTransfer(
    token,
    value,
    1,
    recipientHash as any,
    expiry,
    hashlock,
    note,
    { value: token === NATIVE ? value : 0 }
  )
  return tx.wait()
}

export const claimEscrow = async (signer: ethers.Signer, id: number) => {
  const escrow = await getProtectedEscrow(signer)
  const tx = await escrow.claim(id)
  return tx.wait()
}

export const claimEscrowBySecret = async (signer: ethers.Signer, id: number, preimage: string, recipient?: string) => {
  const escrow = await getProtectedEscrow(signer)
  const tx = await escrow.claimBySecret(id, ethers.utils.toUtf8Bytes(preimage), recipient ?? ethers.constants.AddressZero)
  return tx.wait()
}

export const refundEscrow = async (signer: ethers.Signer, id: number) => {
  const escrow = await getProtectedEscrow(signer)
  const tx = await escrow.refund(id)
  return tx.wait()
}

export const getTransfer = async (sp: SignerOrProvider, id: number) => {
  const escrow = await getProtectedEscrow(sp)
  const t = await escrow.transfers(id)
  return {
    sender: t.sender as string,
    token: t.token as string,
    amount: ethers.utils.formatEther(t.amount),
    expiry: Number(t.expiry),
    recipientRaw: t.recipient as string, // bytes32
    rtype: Number(t.rtype) as 0 | 1,
    hashlock: t.hashlock as string,
    claimed: Boolean(t.claimed),
  }
}

export const getNextTransferId = async (sp: SignerOrProvider) => {
  const escrow = await getProtectedEscrow(sp)
  return (await escrow.nextId()).toNumber()
}

/* ------------------------------ 6) GroupPool ------------------------------- */
export const createGroupPool = async (
  signer: ethers.Signer,
  params: { token?: string; recipient: string; targetETH: string; deadline?: number; metadata?: string }
) => {
  const gp = await getGroupPool(signer)
  const token = params.token ?? NATIVE
  const deadline = params.deadline ?? 0
  const metadata = params.metadata ?? ''
  const tx = await gp.createPool(token, params.recipient, ethers.utils.parseEther(params.targetETH), deadline, metadata)
  return tx.wait()
}

export const contributeToPool = async (signer: ethers.Signer, id: number, amountETH: string) => {
  const gp = await getGroupPool(signer)
  const tx = await gp.contribute(id, 0, { value: ethers.utils.parseEther(amountETH) })
  return tx.wait()
}

export const cancelPool = async (signer: ethers.Signer, id: number) => {
  const gp = await getGroupPool(signer)
  const tx = await gp.cancel(id)
  return tx.wait()
}

export const refundPool = async (signer: ethers.Signer, id: number) => {
  const gp = await getGroupPool(signer)
  const tx = await gp.refund(id)
  return tx.wait()
}

export const getPool = async (sp: SignerOrProvider, id: number) => {
  const gp = await getGroupPool(sp)
  const p = await gp.pools(id)
  return {
    creator: p.creator as string,
    token: p.token as string,
    recipient: p.recipient as string,
    target: ethers.utils.formatEther(p.target),
    total: ethers.utils.formatEther(p.total),
    deadline: Number(p.deadline),
    closed: Boolean(p.closed),
  }
}

export const getPoolContribution = async (sp: SignerOrProvider, id: number, user: string) => {
  const gp = await getGroupPool(sp)
  const v = await gp.contributions(id, user)
  return ethers.utils.formatEther(v)
}

export const getNextPoolId = async (sp: SignerOrProvider) => {
  const gp = await getGroupPool(sp)
  return (await gp.nextPoolId()).toNumber()
}

/* ------------------------------ 7) SavingsPot ------------------------------ */
export const createPot = async (signer: ethers.Signer, token: string | null, targetETH: string) => {
  const spc = await getSavingsPot(signer)
  const tx = await spc.createPot(token ?? NATIVE, ethers.utils.parseEther(targetETH))
  return tx.wait()
}

export const depositToPot = async (signer: ethers.Signer, id: number, amountETH: string) => {
  const spc = await getSavingsPot(signer)
  const tx = await spc.deposit(id, 0, { value: ethers.utils.parseEther(amountETH) })
  return tx.wait()
}

export const withdrawFromPot = async (signer: ethers.Signer, id: number, amountETH: string, to?: string) => {
  const spc = await getSavingsPot(signer)
  const tx = await spc.withdraw(id, ethers.utils.parseEther(amountETH), to ?? ethers.constants.AddressZero)
  return tx.wait()
}

export const closePot = async (signer: ethers.Signer, id: number) => {
  const spc = await getSavingsPot(signer)
  const tx = await spc.close(id)
  return tx.wait()
}

export const getPot = async (sp: SignerOrProvider, id: number) => {
  const spc = await getSavingsPot(sp)
  const p = await spc.pots(id)
  return {
    owner: p.owner as string,
    token: p.token as string,
    target: ethers.utils.formatEther(p.target),
    balance: ethers.utils.formatEther(p.balance),
    created: Number(p.created),
    closed: Boolean(p.closed),
  }
}

export const getNextPotId = async (sp: SignerOrProvider) => {
  const spc = await getSavingsPot(sp)
  return (await spc.nextPotId()).toNumber()
}

/* ------------------------------ 8) Listeners ------------------------------- */
export const listenEscrowEvents = async (
  sp: SignerOrProvider,
  cb: (
    ev:
      | { type: 'TransferCreated'; id: number; sender: string; amount: string; rtype: number; note: string }
      | { type: 'Claimed'; id: number; to: string }
      | { type: 'Refunded'; id: number; to: string }
  ) => void
) => {
  const escrow = await getProtectedEscrow(sp)
  escrow.on('TransferCreated', (id, sender, _token, amount, rtype, _recipient, _expiry, _hash, note) => {
    cb({ type: 'TransferCreated', id: id.toNumber(), sender, amount: ethers.utils.formatEther(amount), rtype: Number(rtype), note })
  })
  escrow.on('Claimed', (id, to) => cb({ type: 'Claimed', id: id.toNumber(), to }))
  escrow.on('Refunded', (id, to) => cb({ type: 'Refunded', id: id.toNumber(), to }))
  return () => escrow.removeAllListeners()
}

export const listenGroupPoolEvents = async (
  sp: SignerOrProvider,
  cb: (
    ev:
      | { type: 'PoolCreated'; id: number; creator: string; recipient: string; target: string }
      | { type: 'Contributed'; id: number; from: string; amount: string; newTotal: string }
      | { type: 'Distributed'; id: number; recipient: string; amount: string }
      | { type: 'Cancelled'; id: number }
      | { type: 'Refunded'; id: number; to: string; amount: string }
  ) => void
) => {
  const gp = await getGroupPool(sp)
  gp.on('PoolCreated', (id, creator, _token, recipient, target) =>
    cb({ type: 'PoolCreated', id: id.toNumber(), creator, recipient, target: ethers.utils.formatEther(target) })
  )
  gp.on('Contributed', (id, from, amount, newTotal) =>
    cb({
      type: 'Contributed',
      id: id.toNumber(),
      from,
      amount: ethers.utils.formatEther(amount),
      newTotal: ethers.utils.formatEther(newTotal),
    })
  )
  gp.on('Distributed', (id, recipient, amount) =>
    cb({ type: 'Distributed', id: id.toNumber(), recipient, amount: ethers.utils.formatEther(amount) })
  )
  gp.on('Cancelled', (id) => cb({ type: 'Cancelled', id: id.toNumber() }))
  gp.on('Refunded', (id, to, amount) => cb({ type: 'Refunded', id: id.toNumber(), to, amount: ethers.utils.formatEther(amount) }))
  return () => gp.removeAllListeners()
}

export const listenSavingsEvents = async (
  sp: SignerOrProvider,
  cb: (
    ev:
      | { type: 'PotCreated'; id: number; owner: string; target: string }
      | { type: 'Deposited'; id: number; from: string; amount: string; newBalance: string }
      | { type: 'Withdrawn'; id: number; to: string; amount: string; newBalance: string }
      | { type: 'Closed'; id: number }
  ) => void
) => {
  const spc = await getSavingsPot(sp)
  spc.on('PotCreated', (id, owner, _token, target) => cb({ type: 'PotCreated', id: id.toNumber(), owner, target: ethers.utils.formatEther(target) }))
  spc.on('Deposited', (id, from, amount, newBalance) =>
    cb({ type: 'Deposited', id: id.toNumber(), from, amount: ethers.utils.formatEther(amount), newBalance: ethers.utils.formatEther(newBalance) })
  )
  spc.on('Withdrawn', (id, to, amount, newBalance) =>
    cb({ type: 'Withdrawn', id: id.toNumber(), to, amount: ethers.utils.formatEther(amount), newBalance: ethers.utils.formatEther(newBalance) })
  )
  spc.on('Closed', (id) => cb({ type: 'Closed', id: id.toNumber() }))
  return () => spc.removeAllListeners()
}

/* ------------------------------ 9) Utils ---------------------------------- */
export const parseEth = (v: string) => ethers.utils.parseEther(v)
export const formatEth = (v: ethers.BigNumber) => ethers.utils.formatEther(v)

// ---- Compatibility wrappers so existing components keep working ----

// Transfers (old names expected by UI)
export const sendToAddress = async (
  signer: ethers.Signer,
  recipient: string,
  amountEth: string,
  remarks: string
) => {
  return createTransferToAddress(signer, recipient, amountEth, { note: remarks });
};

export const sendToUsername = async (
  signer: ethers.Signer,
  username: string,
  amountEth: string,
  remarks: string
) => {
  return createTransferToUsername(signer, username, amountEth, { note: remarks });
};

// Claim/refund (map to escrow functions)
export const claimTransferById = async (signer: ethers.Signer, id: number) =>
  claimEscrow(signer, id);

export const claimTransferByAddress = async (signer: ethers.Signer, senderAddress: string) => {
  // This is a simplified version - you might need to implement proper logic
  // to find transfers by sender address
  throw new Error('claimTransferByAddress not implemented - use claimTransferById instead');
};

export const claimTransferByUsername = async (signer: ethers.Signer, senderUsername: string) => {
  // This is a simplified version - you might need to implement proper logic
  // to find transfers by sender username
  throw new Error('claimTransferByUsername not implemented - use claimTransferById instead');
};

export const refundTransfer = async (signer: ethers.Signer, id: number) =>
  refundEscrow(signer, id);

// Reads (names your UI might call)
export const getTransferDetails = async (signerOrProvider: SignerOrProvider, id: string | number) => {
  const transfer = await getTransfer(signerOrProvider, typeof id === 'string' ? parseInt(id) : id);
  return {
    ...transfer,
    recipient: decodeRecipient(transfer.rtype, transfer.recipientRaw),
    timestamp: 0, // Will be populated from events if needed
    remarks: '', // Will be populated from events if needed
    status: transfer.claimed ? 'Claimed' : 'Pending'
  };
};

// Add missing export
export const getPaymentAmount = async (signerOrProvider: SignerOrProvider, paymentId: string) => {
  const pool = await getPool(signerOrProvider, parseInt(paymentId));
  return pool.target;
};

export const getPendingTransfers = async (signerOrProvider: SignerOrProvider, userAddress: string) => {
  const allTransfers = await getUserTransfers(signerOrProvider, userAddress);
  // Return only pending transfers (status = 0)
  return allTransfers.filter(transfer => transfer.status === 'Pending').map(transfer => transfer.id.toString());
};

// User management
export const getUserByAddress = async (signerOrProvider: SignerOrProvider, address: string) => {
  const registry = await getUsernameRegistry(signerOrProvider);
  return await registry.primaryOf(address);
};

export const getUserByUsername = async (signerOrProvider: SignerOrProvider, username: string) => {
  const registry = await getUsernameRegistry(signerOrProvider);
  return await registry.resolve(username);
};

export const getUserProfile = async (signerOrProvider: SignerOrProvider, userAddress: string) => {
  // This is a simplified version - you might need to implement proper logic
  // to get user profile data
  const username = await getUserByAddress(signerOrProvider, userAddress);
  return {
    username: username || '',
    transferIds: [],
    groupPaymentIds: [],
    participatedGroupPayments: [],
    savingsPotIds: []
  };
};

const bytes32Eq = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

export type UiTransferStatus = 'Pending' | 'Claimed' | 'Refunded' | 'Expired';

export interface UiTransfer {
  id: number;
  direction: 'out' | 'in';
  sender: string;
  recipient: string;        // decoded (address or "(username)")
  amountEth: string;
  createdAt?: number;       // unix seconds
  claimedAt?: number;
  refundedAt?: number;
  status: UiTransferStatus;
  note?: string;
}

/**
 * Returns outgoing transfers for `userAddress` with correct status
 * by merging on-chain storage + TransferCreated/Claimed/Refunded events.
 */
export const getUserTransfers = async (
  sp: SignerOrProvider,
  userAddress: string,
  fromBlock?: number,           // optional scan range tune
  toBlock?: number
): Promise<UiTransfer[]> => {
  const escrow = await getProtectedEscrow(sp);
  const provider = ethers.Signer.isSigner(sp) ? sp.provider! : sp;

  // 1) Pull created events FROM this user (sender is indexed, so cheap).
  const current = await provider.getBlockNumber();
  const start = fromBlock ?? Math.max(0, current - 120_000); // ~safe default
  const end   = toBlock ?? current;

  const createdFilter = escrow.filters.TransferCreated(null, userAddress);
  const createdLogs = await escrow.queryFilter(createdFilter, start, end);

  // 2) Build map by id
  const byId = new Map<number, UiTransfer>();
  for (const log of createdLogs) {
    const { id, sender, token, amount, rtype, recipient, expiry, hashlock, note } = (log.args as any);
    const intId = id.toNumber();
    byId.set(intId, {
      id: intId,
      direction: 'out',
      sender,
      recipient: decodeRecipient(Number(rtype), recipient),
      amountEth: ethers.utils.formatEther(amount),
      createdAt: (await log.getBlock()).timestamp,
      status: 'Pending', // provisional, we'll refine below
      note,
    });
  }

  if (byId.size === 0) return [];

  // 3) For each id, read storage + look for Claim/Refund events
  const ids = Array.from(byId.keys());

  // Query Claim/Refund logs for these ids (id is indexed)
  const claimedLogs = await escrow.queryFilter(escrow.filters.Claimed(null), start, end);
  const refundedLogs = await escrow.queryFilter(escrow.filters.Refunded(null), start, end);

  const claimedById = new Map<number, number>();  // id -> ts
  for (const lg of claimedLogs) {
    const id = (lg.args as any).id.toNumber();
    if (!byId.has(id)) continue;
    const ts = (await lg.getBlock()).timestamp;
    claimedById.set(id, ts);
  }

  const refundedById = new Map<number, number>(); // id -> ts
  for (const lg of refundedLogs) {
    const id = (lg.args as any).id.toNumber();
    if (!byId.has(id)) continue;
    const ts = (await lg.getBlock()).timestamp;
    refundedById.set(id, ts);
  }

  // Finalize each item with on-chain `claimed` flag + expiry
  const results: UiTransfer[] = [];
  for (const id of ids) {
    const row = byId.get(id)!;
    const t = await escrow.transfers(id);
    const claimed = Boolean(t.claimed);
    const expiry = Number(t.expiry);

    if (claimed) {
      row.status = 'Claimed';
      row.claimedAt = claimedById.get(id);
    } else if (refundedById.has(id)) {
      row.status = 'Refunded';
      row.refundedAt = refundedById.get(id);
    } else if (expiry !== 0 && expiry < Math.floor(Date.now() / 1000)) {
      row.status = 'Expired';
    } else {
      row.status = 'Pending';
    }
    results.push(row);
  }

  // newest first
  results.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return results;
};

// Group payments (map to pool functions)
export const createGroupPayment = async (
  signer: ethers.Signer,
  recipient: string,
  numParticipants: number,
  amount: string,
  remarks: string
) => {
  const amountBN = parseEth(amount);
  const targetAmount = amountBN.mul(ethers.BigNumber.from(numParticipants));
  const now = Math.floor(Date.now() / 1000);
  const oneWeek = 7 * 24 * 60 * 60; // 7 days
  return createGroupPool(signer, {
    token: undefined, // ETH
    recipient,
    targetETH: formatEth(targetAmount),
    deadline: now + oneWeek, // 7 days from now
    metadata: remarks
  });
};

export const contributeToGroupPayment = async (
  signer: ethers.Signer,
  paymentId: string,
  amount: string
) => {
  return contributeToPool(signer, parseInt(paymentId), amount);
};

export const getGroupPaymentDetails = async (signerOrProvider: SignerOrProvider, paymentId: string) => {
  const pool = await getPool(signerOrProvider, parseInt(paymentId));
  return {
    id: paymentId,
    paymentId,
    creator: pool.creator,
    recipient: pool.recipient,
    totalAmount: pool.target,
    amountPerPerson: pool.target, // Simplified
    numParticipants: 1, // Simplified
    amountCollected: pool.total,
    timestamp: 0, // Simplified
    status: pool.closed ? 2 : 1, // Simplified
    remarks: '' // Simplified
  };
};

export const hasContributedToGroupPayment = async (
  signerOrProvider: SignerOrProvider,
  paymentId: string,
  userAddress: string
) => {
  const contribution = await getPoolContribution(signerOrProvider, parseInt(paymentId), userAddress);
  return contribution !== '0.0' && contribution !== '0';
};

export const getGroupPaymentContribution = async (
  signerOrProvider: SignerOrProvider,
  paymentId: string,
  userAddress: string
) => {
  const contribution = await getPoolContribution(signerOrProvider, parseInt(paymentId), userAddress);
  return contribution; // Already formatted as string
};

// Savings pots (map to pot functions)
export const createSavingsPot = async (
  signer: ethers.Signer,
  name: string,
  targetAmount: string,
  remarks: string
) => {
  return createPot(signer, null, targetAmount);
};

export const contributeToSavingsPot = async (
  signer: ethers.Signer,
  potId: string,
  amount: string
) => {
  return depositToPot(signer, parseInt(potId), amount);
};

export const breakPot = async (signer: ethers.Signer, potId: string) => {
  return closePot(signer, parseInt(potId));
};

export const getSavingsPotDetails = async (signerOrProvider: SignerOrProvider, potId: string) => {
  const pot = await getPot(signerOrProvider, parseInt(potId));
  return {
    id: potId,
    potId,
    owner: pot.owner,
    name: `Pot ${potId}`, // Simplified name
    targetAmount: pot.target,
    currentAmount: pot.balance,
    timestamp: 0, // Simplified
    status: pot.closed ? 2 : 1, // Simplified
    remarks: '' // Simplified
  };
};

// --- GROUP PAYMENTS: discover a user's pools from events, then load details ---

// Query logs in chunks to avoid RPC limits & numeric faults.
async function getLogsChunked(
  provider: ethers.providers.Provider,
  base: ethers.providers.Filter,
  fromBlock: number,
  toBlock: number,
  step = 50_000, // adjust for your RPC
) {
  const all: ethers.providers.Log[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = Math.min(start + step, toBlock);
    const logs = await provider.getLogs({ ...base, fromBlock: start, toBlock: end });
    all.push(...logs);
    start = end + 1;
  }
  return all;
}

/** Return pool ids you created and you contributed to (deduped). */
export const listUserGroupPaymentIds = async (
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0,                // <-- number, not bigint
) => {
  const gp = await getGroupPool(sp);
  const provider = ethers.Signer.isSigner(sp) ? (sp.provider as ethers.providers.Provider)! : (sp as ethers.providers.Provider);

  const latest = await provider.getBlockNumber();

  // Build filters (ethers v5 filter objects)
  const createdFilter = gp.filters.PoolCreated(null, user);     // (id indexed, creator indexed)
  const contribFilter = gp.filters.Contributed(null, user);      // (id indexed, from indexed)

  const [createdLogs, contribLogs] = await Promise.all([
    getLogsChunked(provider, createdFilter, fromBlock, latest),
    getLogsChunked(provider, contribFilter, fromBlock, latest),
  ]);

  const created = new Set<number>();
  for (const log of createdLogs) {
    const parsed = gp.interface.parseLog(log);
    const id: ethers.BigNumber = parsed.args.id;
    created.add(id.toNumber());
  }

  const participated = new Set<number>();
  for (const log of contribLogs) {
    const parsed = gp.interface.parseLog(log);
    const id: ethers.BigNumber = parsed.args.id;
    const n = id.toNumber();
    if (!created.has(n)) participated.add(n);
  }

  const all = Array.from(new Set<number>([...Array.from(created), ...Array.from(participated)]));
  return { created: Array.from(created), participated: Array.from(participated), all };
};

/** Load full details for the user's group payments (for History UI). */
export const getUserGroupPayments = async (
  sp: ethers.Signer | ethers.providers.Provider,
  user: string,
  fromBlock = 0,                // <-- number, not bigint
) => {
  const ids = await listUserGroupPaymentIds(sp, user, fromBlock);
  const gp = await getGroupPool(sp);
  const details = await Promise.all(ids.all.map(async (id) => {
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
  }));
  return details;
};

// Error handling
export const handleContractError = (error: unknown, chainId?: number): string => {
  if (error instanceof Error) {
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('CALL_EXCEPTION')) {
      return `Contract call failed: ${error.message}`;
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};
