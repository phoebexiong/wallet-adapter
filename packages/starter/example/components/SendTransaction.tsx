import { Button } from '@material-ui/core';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { useNotify } from './notify';
const splToken = require('@solana/spl-token');
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";import { getParsedNftAccountsByOwner,isValidSolanaAddress, createConnectionConfig,} from "@nfteyez/sol-rayz";
import { web3, Wallet } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WalletKeypairError } from '@solana/wallet-adapter-base';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base'
import { PublicKey } from '@solana/web3.js'
import React from 'react'
import { toast } from 'react-hot-toast'
import { getOrCreateAssociatedTokenAccount } from './getOrCreateAssociatedTokenAccount'
import { createTransferInstruction } from './createTransferInstructions'


interface Props {
    children: (sendTransaction: OnSendTransaction) => React.ReactNode
}

type OnSendTransaction = (toPublicKey: string, amount: number) => void

// Docs: https://github.com/solana-labs/solana-program-library/pull/2539/files
// https://github.com/solana-labs/wallet-adapter/issues/189
// repo: https://github.com/solana-labs/example-token/blob/v1.1/src/client/token.js
// creating a token for testing: https://learn.figment.io/tutorials/sol-mint-token
const SendTransaction: React.FC<Props> = ({ children }) => {
    const { connection } = useConnection()
    const { publicKey, signTransaction, sendTransaction } = useWallet()

    const onSendSPLTransaction = useCallback(
        async (toPubkey: string, amount: number) => {
            if (!toPubkey || !amount) return
            const toastId = toast.loading('Processing transaction...')

            try {
                if (!publicKey || !signTransaction) throw new WalletNotConnectedError()
                const toPublicKey = new PublicKey('CAS8Ez367Q79rxg1mYPkNeswSkeVZY5vCGuirvCp7gW5')
                const mint = new PublicKey('GY13J1uQAWb6XqthM5V6pWaozznW1gGJ8qasDNp6QL9X')

                const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
                    connection,
                    publicKey,
                    mint,
                    publicKey,
                    signTransaction
                )

                const toTokenAccount = await getOrCreateAssociatedTokenAccount(
                    connection,
                    publicKey,
                    mint,
                    toPublicKey,
                    signTransaction
                )

                const transaction = new Transaction().add(
                    createTransferInstruction(
                        fromTokenAccount.address, // source
                        toTokenAccount.address, // dest
                        publicKey,
                        amount * LAMPORTS_PER_SOL,
                        [],
                        TOKEN_PROGRAM_ID
                    )
                )

                const blockHash = await connection.getRecentBlockhash()
                transaction.feePayer = await publicKey
                transaction.recentBlockhash = await blockHash.blockhash
                const signed = await signTransaction(transaction)

                await connection.sendRawTransaction(signed.serialize())

                toast.success('Transaction sent', {
                    id: toastId,
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                toast.error(`Transaction failed: ${error.message}`, {
                    id: toastId,
                })
            }
        },
        [publicKey, sendTransaction, connection]
    )

    return <>{children(onSendSPLTransaction)}</>
}

export default SendTransaction
