import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { erc20Abi, parseUnits } from 'viem'
import { Buffer } from 'buffer'
import cfg from '../config/config.json'
import { activeNetworks, caOf, netByChainId, Network } from '../config/chains'

const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const u64 = (n: bigint) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, n, true); return b }
const ata = (owner: PublicKey, mint: PublicKey, prog: PublicKey) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), prog.toBuffer(), mint.toBuffer()], ATA_PROGRAM)[0]

export type PayResult = { hash: string; network: Network; from: string }

// Sends $YOUTOK from the connected wallet to the creator's wallet on the chosen network
export function usePay() {
  const evm = useAccount()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient()
  const sol = useWallet()
  const { connection } = useConnection()

  const options = activeNetworks.filter((n) => caOf(n))

  async function pay(net: Network, to: string, amount: number): Promise<PayResult> {
    const ca = caOf(net)
    if (!ca) throw new Error(`No ${cfg.symbol} contract address set for ${net.name} yet`)
    if (!to) throw new Error(`The creator has not linked a ${net.vm === 'svm' ? 'Solana' : 'EVM'} wallet`)
    if (net.vm === 'evm') {
      if (!evm.isConnected || !evm.address) throw new Error('Connect an EVM wallet first')
      if (netByChainId(evm.chainId)?.key !== net.key) throw new Error(`Switch your wallet to ${net.name}`)
      const decimals = client ? await client.readContract({ address: ca as `0x${string}`, abi: erc20Abi, functionName: 'decimals' }).catch(() => cfg.tokenDecimals) : cfg.tokenDecimals
      const hash = await writeContractAsync({ address: ca as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [to as `0x${string}`, parseUnits(String(amount), decimals)] })
      return { hash, network: net, from: evm.address }
    }
    if (!sol.publicKey || !sol.sendTransaction) throw new Error('Connect a Solana wallet first')
    const mint = new PublicKey(ca), owner = sol.publicKey, dest = new PublicKey(to)
    const info = await connection.getAccountInfo(mint)
    if (!info) throw new Error('Token mint not found on Solana')
    const prog = info.owner, decimals = info.data[44]
    const src = ata(owner, mint, prog), dst = ata(dest, mint, prog)
    const raw = parseUnits(String(amount), decimals)
    const tx = new Transaction().add(
      // create the creator's token account if missing (idempotent)
      new TransactionInstruction({ programId: ATA_PROGRAM, data: Buffer.from([1]), keys: [
        { pubkey: owner, isSigner: true, isWritable: true }, { pubkey: dst, isSigner: false, isWritable: true },
        { pubkey: dest, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: prog, isSigner: false, isWritable: false },
      ] }),
      // TransferChecked
      new TransactionInstruction({ programId: prog, data: Buffer.from([12, ...u64(raw), decimals]), keys: [
        { pubkey: src, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: dst, isSigner: false, isWritable: true }, { pubkey: owner, isSigner: true, isWritable: false },
      ] }),
    )
    const hash = await sol.sendTransaction(tx, connection)
    return { hash, network: net, from: owner.toBase58() }
  }
  return { pay, options, evm, sol }
}
