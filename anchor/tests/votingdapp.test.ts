import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  getProgramDerivedAddress,
  getU64Encoder,
  Instruction,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import { fetchPool, getGreetInstruction, getInitializePoolInstruction, VOTINGDAPP_PROGRAM_ADDRESS } from '../src'
import { loadKeypairSignerFromFile } from 'gill/node'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({ urlOrMoniker: process.env.ANCHOR_PROVIDER_URL! })
describe('votingdapp', () => {
  let payer: KeyPairSigner
  // let state: KeyPairSigner
  // let payerSigner: Awaited<ReturnType<typeof generateKeyPairSigner>>
  // let payerSigner: Awaited<ReturnType<typeof loadKeypairSignerFromFile>>

  beforeAll(async () => {
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
    // state = await generateKeyPairSigner()
  })

  it('should run the program and print "GM!" to the transaction log', async () => {
    expect.assertions(1)
    const ix = getGreetInstruction()
    const sx = await sendAndConfirm({ ix, payer })
    expect(sx).toBeDefined()
  })

  it('should initialize the pool', async () => {
    expect.assertions(5)
    const poolId = 1n
    const description = 'Unit test pool (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const poolStart = nowSec + 60n
    const poolEnd = nowSec + 3600n

    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(poolId)],
    })
    const ix = getInitializePoolInstruction({
      signer: payer,
      pool: poolPda,
      poolId,
      description,
      poolStart,
      poolEnd,
    })
    const sx = await sendAndConfirm({ ix, payer })
    expect(sx).toBeDefined()
    // const { value: accountInfo } = await rpc.getAccountInfo(poolPda, { encoding: 'base64' }).send()
    // expect(accountInfo).not.toBeNull()
    const currentPool = await fetchPool(rpc, poolPda)
    expect(currentPool.data.poolId).toEqual(poolId)
    expect(currentPool.data.description).toEqual(description)
    expect(currentPool.data.poolStart).toEqual(poolStart)
    expect(currentPool.data.poolEnd).toEqual(poolEnd)
  })
})

let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) {
    return latestBlockhash
  }
  return await rpc
    .getLatestBlockhash()
    .send()
    .then(({ value }) => value)
}
async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })
  const signedTransaction = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTransaction)
}
