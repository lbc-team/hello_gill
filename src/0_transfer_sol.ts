import 'dotenv/config';
import {
    getExplorerLink,
    createTransaction,
    createSolanaClient,
    SolanaClusterMoniker,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
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

  const signer2 = await loadKeypairSignerFromFile("keypairs/my.json");
  console.log("address2:", signer2.address);
  
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

  // 查询发送方账户余额
  const { value: senderBalance } = await rpc.getBalance(signer.address).send();
  console.log("发送方账户余额（SOL）:", Number(senderBalance) / 1_000_000_000);

  const receiver = address("8gwAbvN8t7n7PoTqWhuqPJ7s4Vgov1YNPByMBJavgHJt");
  
  // 查询接收方账户余额
  const { value: receiverBalanceBefore } = await rpc.getBalance(receiver).send();
  console.log("接收方账户余额（转账前）（SOL）:", Number(receiverBalanceBefore) / 1_000_000_000);

  /**
   * 创建一个转账指令
   */
  const transferSolIx = getTransferSolInstruction({
    amount: 1_000_000,
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
    feePayer: signer2,
    instructions: [transferSolIx],
    latestBlockhash,
  });

  //  使用 feePayer和source 提供的 `signer` 对交易进行签名
  let signedTransaction = await signTransactionMessageWithSigners(tx);
  
  // 获取交易签名信息
  let signature = getSignatureFromTransaction(signedTransaction);
  
  // 打印 Solana Explorer 的链接
  console.log("Explorer Link:");
  console.log(
    getExplorerLink({
      cluster: "devnet",
      transaction: signature,
    }),
  );
  
  try {
    // 实际将交易发送到区块链并确认
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

  // 转账成功后再次查询双方余额
  const { value: senderBalanceAfter } = await rpc.getBalance(signer.address).send();
  console.log("发送方账户余额（转账后）（SOL）:", Number(senderBalanceAfter) / 1_000_000_000);

  const { value: receiverBalanceAfter } = await rpc.getBalance(signer2.address).send();
  console.log("接收方账户余额（转账后）（SOL）:", Number(receiverBalanceAfter) / 1_000_000_000);