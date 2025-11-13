import 'dotenv/config';
import {
    createSolanaClient,
    generateKeyPairSigner,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { buildCreateTokenTransaction, TOKEN_2022_PROGRAM_ADDRESS } from "gill/programs/token";
  

  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("signer:", signer.address);
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const tokenProgram = TOKEN_2022_PROGRAM_ADDRESS;
  const mint = await generateKeyPairSigner();
  console.log("mint:", mint.address);
  
  // cQwQU6WZCQMYrGbnh47UmJmTLpnk7FZueSSYh14u5JR
  const tx = await buildCreateTokenTransaction({
    feePayer: signer,
    version: "legacy",
    decimals: 9,
    metadata: {
      isMutable: true,
      name: "UPChain Test Token",
      symbol: "UPCT",
      uri: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/tokenmeta.json",
    },
    mint,
    latestBlockhash,
    // defaults to `TOKEN_PROGRAM_ADDRESS`
    tokenProgram,
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