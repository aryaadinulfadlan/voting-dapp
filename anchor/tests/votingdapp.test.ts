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
import {
  fetchCandidateAccount,
  fetchPollAccount,
  getGreetInstruction,
  getInitializeCandidateInstruction,
  getInitializePoolInstruction,
  VOTINGDAPP_PROGRAM_ADDRESS,
} from '../src'
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

  it('should initialize the poll', async () => {
    expect.assertions(6)
    const pollId = 1n
    const name = 'Unit test pool'
    const description = 'Desc of unit test pool (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const startTime = nowSec + 60n
    const endTime = nowSec + 3600n

    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll'), getU64Encoder().encode(pollId)],
    })
    const ix = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda,
      pollId,
      name,
      description,
      startTime,
      endTime,
    })
    const sx = await sendAndConfirm({ ix, payer })
    expect(sx).toBeDefined()
    // const { value: accountInfo } = await rpc.getAccountInfo(poolPda, { encoding: 'base64' }).send()
    // expect(accountInfo).not.toBeNull()
    const currentPool = await fetchPollAccount(rpc, poolPda)
    expect(currentPool.data.pollId).toEqual(pollId)
    expect(currentPool.data.pollName).toEqual(name)
    expect(currentPool.data.pollDescription).toEqual(description)
    expect(currentPool.data.pollVotingStart).toEqual(startTime)
    expect(currentPool.data.pollVotingEnd).toEqual(endTime)
  })

  it('should initialize the candidate', async () => {
    expect.assertions(3)
    const pollId = 1n
    const candidate = 'John'

    const [candidatePda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId), Buffer.from(candidate, 'utf8')],
    })
    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId)],
    })
    const ix = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda,
      pollId,
      candidate,
    })
    const sx = await sendAndConfirm({ ix, payer })
    expect(sx).toBeDefined()
    const currentPool = await fetchPollAccount(rpc, poolPda)
    const currentCandidate = await fetchCandidateAccount(rpc, candidatePda)
    expect(currentPool.data.pollId).toEqual(pollId)
    expect(currentCandidate.data.candidateName).toEqual(candidate)
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
