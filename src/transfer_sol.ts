import 'dotenv/config';
import {
    getExplorerLink,
    createTransaction,
    createSolanaClient,
    SolanaClusterMoniker,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { getTransferSolInstruction } from "gill/programs";
  
  /**
   * 从本地文件系统加载密钥对签名者
   *
   * 默认使用 Solana CLI 的文件路径：`~/.config/solana/id.json`
   */
  const signer = await loadKeypairSignerFromFile();
  console.log("address:", signer.address);
  
  /**
   * 声明要与哪个 Solana 网络集群交互
   */
  const cluster = process.env.DEVNET_RPC || "devnet";
  console.log("process.env.DEVNET_RPC:", process.env.DEVNET_RPC);
  console.log("cluster:", cluster);
  
  /**
   * 创建到 Solana 区块链的客户端连接
   *
   * 注意：`urlOrMoniker` 可以是 Solana 网络的别名，也可以是你的 RPC 提供商的完整 URL
   */
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  

  const receiver = "8gwAbvN8t7n7PoTqWhuqPJ7s4Vgov1YNPByMBJavgHJt";
  /**
   * 创建一个 memo 指令，在链上发布一条简单消息
   *（最简单的指令类型！）
   */
  const transferSolIx =  getTransferSolInstruction({
    amount: 1_000,
    destination: receiver,
    source: signer,
});
  
  /**
   * 获取最新的区块哈希（即交易生命周期）。这相当于区块链处理交易时的一个最近时间戳
   *
   * 提示：在发起交易时再请求它
   */
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  console.log("latestBlockhash:", latestBlockhash);
  
  /**
   * 创建要发送到区块链的交易
   */
  let tx = createTransaction({
    version: "legacy",
    feePayer: signer,
    instructions: [transferSolIx],
    latestBlockhash,
  });
  console.log("Transaction:");
  console.log(tx);
  
  /**
   * 使用提供的 `signer` 对交易进行签名
   */
  let signedTransaction = await signTransactionMessageWithSigners(tx);
  // console.log("signedTransaction:");
  
  /**
   * 在 `feePayer` 签名后获取交易签名信息
   */
  let signature = getSignatureFromTransaction(signedTransaction);
  
  /**
   * 打印 Solana Explorer 的链接
   */
  console.log("Explorer Link:");
  console.log(
    getExplorerLink({
      cluster: "devnet",
      transaction: signature,
    }),
  );
  
  try {
    /**
     * 实际将交易发送到区块链并确认
     */
    await sendAndConfirmTransaction(signedTransaction);
  
    // 你也可以手动定义发送交易的其他设置
    // await sendAndConfirmTransaction(signedTransaction, {
    //   commitment: "confirmed",
    //   skipPreflight: true,
    //   maxRetries: 10n,
    // });
  
    console.log("Transaction confirmed!", signature);
  } catch (err) {
    console.error("Unable to send and confirm the transaction");
    console.error(err);
  }