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
  getVoteInstruction,
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
    expect.assertions(7)
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
    expect(currentPool.data.pollOptionIndex).toEqual(0n)
  })

  it('should initialize the candidate', async () => {
    expect.assertions(5)
    const pollId = 2n
    const poll_name = 'second pool'
    const poll_description = 'Desc of second pool (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const startTime = nowSec + 60n
    const endTime = nowSec + 3600n

    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId)],
    })
    const ix_poll = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda,
      pollId,
      name: poll_name,
      description: poll_description,
      startTime,
      endTime,
    })
    const sx_poll = await sendAndConfirm({ ix: ix_poll, payer })
    expect(sx_poll).toBeDefined()
    const currentPool = await fetchPollAccount(rpc, poolPda)
    expect(currentPool.data.pollId).toEqual(pollId)
    expect(currentPool.data.pollName).toEqual(poll_name)

    const candidate = 'Smooth'
    const [candidatePda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId), Buffer.from(candidate, 'utf8')],
    })
    const ix_candidate = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda,
      pollId,
      candidate,
    })
    const sx_candidate = await sendAndConfirm({ ix: ix_candidate, payer })
    expect(sx_candidate).toBeDefined()
    const currentCandidate = await fetchCandidateAccount(rpc, candidatePda)
    expect(currentCandidate.data.candidateName).toEqual(candidate)
  })

  it('should initialize two candidate for one poll', async () => {
    expect.assertions(7)
    const pollId = 3n
    const poll_name = 'third pool'
    const poll_description = 'Desc of third pool (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const startTime = nowSec + 60n
    const endTime = nowSec + 3600n

    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId)],
    })
    const ix_poll = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda,
      pollId,
      name: poll_name,
      description: poll_description,
      startTime,
      endTime,
    })
    const sx_poll = await sendAndConfirm({ ix: ix_poll, payer })
    expect(sx_poll).toBeDefined()
    const currentPool = await fetchPollAccount(rpc, poolPda)
    expect(currentPool.data.pollId).toEqual(pollId)
    expect(currentPool.data.pollName).toEqual(poll_name)

    const candidate_1 = 'Smooth'
    const candidate_2 = 'Crunchy'
    const [candidatePda_1] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId), Buffer.from(candidate_1, 'utf8')],
    })
    const [candidatePda_2] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId), Buffer.from(candidate_2, 'utf8')],
    })
    const ix_candidate_1 = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda_1,
      pollId,
      candidate: candidate_1,
    })
    const ix_candidate_2 = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda_2,
      pollId,
      candidate: candidate_2,
    })
    const sx_candidate_1 = await sendAndConfirm({ ix: ix_candidate_1, payer })
    const sx_candidate_2 = await sendAndConfirm({ ix: ix_candidate_2, payer })
    expect(sx_candidate_1).toBeDefined()
    expect(sx_candidate_2).toBeDefined()
    const currentCandidate_1 = await fetchCandidateAccount(rpc, candidatePda_1)
    const currentCandidate_2 = await fetchCandidateAccount(rpc, candidatePda_2)
    expect(currentCandidate_1.data.candidateName).toEqual(candidate_1)
    expect(currentCandidate_2.data.candidateName).toEqual(candidate_2)
  })

  it('should initialize two candidate for two poll', async () => {
    expect.assertions(10)
    const pollId_1 = 4n
    const pollId_2 = 5n
    const poll_name = 'poll name'
    const poll_description = 'Desc of poll (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const startTime = nowSec + 60n
    const endTime = nowSec + 3600n

    const [poolPda_1] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId_1)],
    })
    const ix_poll_1 = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda_1,
      pollId: pollId_1,
      name: poll_name,
      description: poll_description,
      startTime,
      endTime,
    })
    const [poolPda_2] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId_2)],
    })
    const ix_poll_2 = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda_2,
      pollId: pollId_2,
      name: poll_name,
      description: poll_description,
      startTime,
      endTime,
    })
    const sx_poll_1 = await sendAndConfirm({ ix: ix_poll_1, payer })
    expect(sx_poll_1).toBeDefined()
    const first_poll = await fetchPollAccount(rpc, poolPda_1)
    expect(first_poll.data.pollId).toEqual(pollId_1)
    expect(first_poll.data.pollName).toEqual(poll_name)

    const sx_poll_2 = await sendAndConfirm({ ix: ix_poll_2, payer })
    expect(sx_poll_2).toBeDefined()
    const second_poll = await fetchPollAccount(rpc, poolPda_2)
    expect(second_poll.data.pollId).toEqual(pollId_2)
    expect(second_poll.data.pollName).toEqual(poll_name)

    const candidate_1 = 'Smooth'
    const candidate_2 = 'Crunchy'
    const [candidatePda_1] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId_1), Buffer.from(candidate_1, 'utf8')],
    })
    const [candidatePda_2] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId_2), Buffer.from(candidate_2, 'utf8')],
    })
    const ix_candidate_1 = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda_1,
      candidateAccount: candidatePda_1,
      pollId: pollId_1,
      candidate: candidate_1,
    })
    const ix_candidate_2 = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda_2,
      candidateAccount: candidatePda_2,
      pollId: pollId_2,
      candidate: candidate_2,
    })
    const sx_candidate_1 = await sendAndConfirm({ ix: ix_candidate_1, payer })
    const sx_candidate_2 = await sendAndConfirm({ ix: ix_candidate_2, payer })
    expect(sx_candidate_1).toBeDefined()
    expect(sx_candidate_2).toBeDefined()
    const currentCandidate_1 = await fetchCandidateAccount(rpc, candidatePda_1)
    const currentCandidate_2 = await fetchCandidateAccount(rpc, candidatePda_2)
    expect(currentCandidate_1.data.candidateName).toEqual(candidate_1)
    expect(currentCandidate_2.data.candidateName).toEqual(candidate_2)
  })

  it('should vote the candidate', async () => {
    expect.assertions(9)
    const pollId = 6n
    const poll_name = 'sixth pool'
    const poll_description = 'Desc of sixth pool (gill)'
    const nowSec = BigInt(Math.floor(Date.now() / 1000))
    const startTime = nowSec - 60n
    const endTime = nowSec + 3600n

    const [poolPda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [Buffer.from('poll', 'utf8'), getU64Encoder().encode(pollId)],
    })
    const ix_poll = getInitializePoolInstruction({
      signer: payer,
      pollAccount: poolPda,
      pollId,
      name: poll_name,
      description: poll_description,
      startTime,
      endTime,
    })
    const sx_poll = await sendAndConfirm({ ix: ix_poll, payer })
    expect(sx_poll).toBeDefined()
    const currentPool = await fetchPollAccount(rpc, poolPda)
    expect(currentPool.data.pollId).toEqual(pollId)
    expect(currentPool.data.pollName).toEqual(poll_name)

    const candidate = 'Smooth'
    const [candidatePda] = await getProgramDerivedAddress({
      programAddress: VOTINGDAPP_PROGRAM_ADDRESS,
      seeds: [getU64Encoder().encode(pollId), Buffer.from(candidate, 'utf8')],
    })
    const ix_candidate = getInitializeCandidateInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda,
      pollId,
      candidate,
    })
    const sx_candidate = await sendAndConfirm({ ix: ix_candidate, payer })
    expect(sx_candidate).toBeDefined()
    const currentCandidate = await fetchCandidateAccount(rpc, candidatePda)
    expect(currentCandidate.data.candidateName).toEqual(candidate)
    expect(currentCandidate.data.candidateVotes).toEqual(0n)

    const ix_vote = getVoteInstruction({
      signer: payer,
      pollAccount: poolPda,
      candidateAccount: candidatePda,
      pollId,
      candidate,
    })
    const sx_vote = await sendAndConfirm({ ix: ix_vote, payer })
    expect(sx_vote).toBeDefined()
    const updatedCandidate = await fetchCandidateAccount(rpc, candidatePda)
    expect(updatedCandidate.data.candidateName).toEqual(candidate)
    expect(updatedCandidate.data.candidateVotes).toEqual(1n)
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
