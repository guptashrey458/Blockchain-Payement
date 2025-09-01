import { ethers } from 'ethers';

/** Decode the 32-byte recipient field from ProtectedEscrow. */
export function decodeRecipient(rtype: number, recipientRaw: string) {
  if (rtype === 0) {
    // Address recipient: right-most 20 bytes of padded bytes32
    const addr = '0x' + recipientRaw.slice(26); // keep 40 hex chars
    return ethers.utils.getAddress(addr);
  }
  // Username recipient (hash): cannot reverse keccak hash → just label it
  return '(username)';
}
