import 'dotenv/config';

import {
    address,
    createSolanaClient,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { buildTransferTokensTransaction, TOKEN_PROGRAM_ADDRESS, getAssociatedTokenAccountAddress } from "gill/programs/token";
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  console.log("cluster:", cluster);
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const mint = address("HeLpHNEGKWKAXt8J9ccEKG7s968cyXPxRHvrDSdQL6BH");
  const tokenProgram = TOKEN_PROGRAM_ADDRESS; // use the correct program for the `mint`
  
  // 钱包地址
  const destination = address("8zu7hBjqPKFMCrB15LkfMDbExdvF88C9ao1hCRuwXNJH");
  
  const tx = await buildTransferTokensTransaction({
    feePayer: signer,
    version: "legacy",
    latestBlockhash,
    amount: 1_000_000,
    authority: signer,
    destination: destination,
    mint,
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

    // 获取Token余额的方法
async function getTokenBalance(tokenAccount: string) {
    try {
        const response = await rpc.getTokenAccountBalance(address(tokenAccount)).send();
        return parseFloat(response.value.uiAmountString || "0");
    } catch (error) {
        console.log("账户不存在或余额为0");
        return 0;
    }
    }

  const destinationAta = await getAssociatedTokenAccountAddress(mint, destination, tokenProgram);
  console.log("转账后Token余额:", await getTokenBalance(destinationAta));