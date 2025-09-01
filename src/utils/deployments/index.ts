const D31337 = require('./31337.json');
const D11155111 = require('./11155111.json'); 

export type Deployment = {
  chainId: number;
  UsernameRegistry: string;
  ProtectedEscrow: string;
  GroupPool: string;
  SavingsPot: string;
};

const map: Record<number, Deployment> = {
  31337: D31337 as Deployment,
  11155111: D11155111 as Deployment,
  // add testnets (Linea, Mantle…) as you deploy them
};

export function getDeployment(chainId: number): Deployment {
  const d = map[chainId];
  if (!d) throw new Error(`No deployment for chain ${chainId}`);
  return d;
}

