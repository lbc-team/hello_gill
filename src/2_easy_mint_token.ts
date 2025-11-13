import 'dotenv/config';

import {
    address,
    createSolanaClient,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { 
    getAssociatedTokenAccountAddress,
    TOKEN_PROGRAM_ADDRESS,
    buildMintTokensTransaction } from "gill/programs/token";
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("signer:", signer.address);
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const mint = address("HeLpHNEGKWKAXt8J9ccEKG7s968cyXPxRHvrDSdQL6BH");
  
  const owner = address("6oLiQn73H8EWnbo5sSuFx1V4KNAasBgFP39puLR9Emaw");
  
  const tx = await buildMintTokensTransaction({
    feePayer: signer,
    version: "legacy",
    latestBlockhash,
    amount: 1_000_000_000,
    destination: owner,
    mint,
    mintAuthority: signer,
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

  // 获取铸造后的余额和总发行量
  const ata = await getAssociatedTokenAccountAddress(mint, owner, TOKEN_PROGRAM_ADDRESS);
  console.log("铸造后Token余额:", await getTokenBalance(ata));