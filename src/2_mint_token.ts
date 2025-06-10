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
    getMintToInstruction,
    TOKEN_PROGRAM_ADDRESS,
  } from "gill/programs/token";
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("signer:", signer.address);
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const mint = address("GkoTqdPyXFnEg27ZrRZbd5D1Hgb2M76aQ44Ed9vqZLot");
  
  const owner = address("6oLiQn73H8EWnbo5sSuFx1V4KNAasBgFP39puLR9Emaw");
  

  const ata = await getAssociatedTokenAccountAddress(mint, owner, TOKEN_PROGRAM_ADDRESS);
  console.log("ata:", ata);
  
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
  
  // 获取Token总发行量的方法
  async function getTokenSupply(mintAddress: string) {
    try {
      const response = await rpc.getTokenSupply(address(mintAddress)).send();
      return parseFloat(response.value.uiAmountString || "0");
    } catch (error) {
      console.log("无法获取总发行量");
      return 0;
    }
  }
  
  // 获取铸造前的余额和总发行量
  console.log("铸造前Token余额:", await getTokenBalance(ata));
  console.log("铸造前总发行量:", await getTokenSupply(mint));
  
  const tx = createTransaction({
    feePayer: signer,
    version: "legacy",
    instructions: [
        // 复用或创建 associated token account 账户
      getCreateAssociatedTokenIdempotentInstruction({
        mint,
        owner,
        payer: signer,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        ata,
      }),
      // 铸造 token
      getMintToInstruction(
        {
          mint,
          mintAuthority: signer,
          token: ata,
          amount: 1_000_000_000,
        },
        {
          programAddress: TOKEN_PROGRAM_ADDRESS,
        },
      ),
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
  
  // 获取铸造后的余额和总发行量
  console.log("铸造后Token余额:", await getTokenBalance(ata));
  console.log("铸造后总发行量:", await getTokenSupply(mint));