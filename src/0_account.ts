import 'dotenv/config';
import {
    getExplorerLink,
    createTransaction,
    createSolanaClient,
    SolanaClusterMoniker,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
    generateKeyPairSigner
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { getTransferSolInstruction } from "gill/programs";
  
  /**
   * 从本地文件系统加载密钥对签名者
   *
   * 默认使用 Solana CLI 的文件路径：`~/.config/solana/id.json`
   */
  const signer = await loadKeypairSignerFromFile();
  console.log("signer publicKey:", signer);
  console.log("address:", signer.address);

  const signer2 = await loadKeypairSignerFromFile("my.json");
  console.log("address2:", signer2.address);

  // 生成新的密钥对
  const keyPair = await generateKeyPairSigner();
  console.log("keyPair:", keyPair.address);


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

  