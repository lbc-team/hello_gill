import 'dotenv/config';

import {
    address,
    createSolanaClient,
    createTransaction,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import {
    getAssociatedTokenAccountAddress,
    getCreateAssociatedTokenIdempotentInstruction,
    getTransferInstruction,
    TOKEN_PROGRAM_ADDRESS,
  } from "gill/programs/token";
  
  const signer = await loadKeypairSignerFromFile();
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  console.log("cluster:", cluster);
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster, // or `mainnet`, `localnet`, etc
  });
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const mint = address("GkoTqdPyXFnEg27ZrRZbd5D1Hgb2M76aQ44Ed9vqZLot");
  const tokenProgram = TOKEN_PROGRAM_ADDRESS; // use the correct program for the `mint`
  
  // 钱包地址
  const destination = address("8zu7hBjqPKFMCrB15LkfMDbExdvF88C9ao1hCRuwXNJH");
  const destinationAta = await getAssociatedTokenAccountAddress(mint, destination, tokenProgram);
  const sourceAta = await getAssociatedTokenAccountAddress(mint, signer, tokenProgram);
  
  const transaction = createTransaction({
    feePayer: signer,
    version: "legacy",
    instructions: [
      // 复用或创建 associated token account 账户
      getCreateAssociatedTokenIdempotentInstruction({
        mint,
        payer: signer,
        tokenProgram,
        owner: destination,
        ata: destinationAta,
      }),
      getTransferInstruction({
        source: sourceAta,
        authority: signer,
        destination: destinationAta,
        amount: 1000n,
      }, {
        programAddress: tokenProgram,  // 指定 token program , 需要和mint 账户匹配
      }),
    ],
    latestBlockhash,
  });
  
  const signedTransaction = await signTransactionMessageWithSigners(transaction);
  
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

  console.log("转账后Token余额:", await getTokenBalance(destinationAta));