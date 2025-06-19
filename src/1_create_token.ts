import 'dotenv/config';

import {
    createSolanaClient,
    createTransaction,
    generateKeyPairSigner,
    getExplorerLink,
    getMinimumBalanceForRentExemption,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import {
    getCreateAccountInstruction,
  } from "gill/programs";
  import {
    getInitializeMintInstruction,
    getMintSize,
    TOKEN_PROGRAM_ADDRESS,
  } from "gill/programs/token";

  
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  console.log("process.env.DEVNET_RPC:", process.env.DEVNET_RPC);
  console.log("cluster:", cluster);

  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("signer:", signer.address);
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const tokenProgram = TOKEN_PROGRAM_ADDRESS;

  const mint = await generateKeyPairSigner();
  console.log("mint:", mint.address);
  
  const space = getMintSize();
  
   

  const tx = createTransaction({
    feePayer: signer,
    version: "legacy",
    instructions: [
      
      getCreateAccountInstruction({
        space,
        lamports: getMinimumBalanceForRentExemption(space),
        newAccount: mint,
        payer: signer,
        programAddress: tokenProgram,
      }),
      getInitializeMintInstruction(
        {
          mint: mint.address,
          mintAuthority: signer.address,
          freezeAuthority: signer.address,
          decimals: 9,
        },
        {
          programAddress: tokenProgram,
        },
      )
    ],
    latestBlockhash,
  });
  
  const signedTransaction = await signTransactionMessageWithSigners(tx);
  
  console.log(
    "Explorer:",
    getExplorerLink({
      cluster: "devnet",
      transaction: getSignatureFromTransaction(signedTransaction),
    }),
  );
  
  await sendAndConfirmTransaction(signedTransaction);