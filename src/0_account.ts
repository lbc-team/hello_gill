import 'dotenv/config';
import {
    createSolanaClient,
    generateKeyPairSigner,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  
  
  /**
   * 从本地文件系统加载密钥对签名者
   * 默认使用 Solana CLI 的文件路径：`~/.config/solana/id.json`
   */
  const signer = await loadKeypairSignerFromFile();
  console.log("address:", signer.address);
  
  // 从keypair文件加载密钥对签名者
  const signer2 = await loadKeypairSignerFromFile("keypairs/my.json");
  console.log("address2:", signer2.address);

  // 生成新的密钥对
  const newKeyPair = await generateKeyPairSigner();
  console.log("newKeyPair address:", newKeyPair.address);
  
  // http://127.0.0.1:8899 for solana-test-validator 
  const cluster = process.env.DEVNET_RPC || "devnet";
  console.log("process.env.DEVNET_RPC:", process.env.DEVNET_RPC);
  console.log("cluster:", cluster);
  
  /**
   * 创建到 Solana 区块链的客户端连接
   * `urlOrMoniker` 可以是 Solana 网络的别名，也可以是你的 RPC 提供商的完整 URL
   */
  const { rpc } = createSolanaClient({
    urlOrMoniker: cluster,
  });

  const { value: balance } = await rpc.getBalance(signer.address).send();
  console.log("balance:", Number(balance) / 1_000_000_000);