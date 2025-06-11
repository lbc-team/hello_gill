import 'dotenv/config';
import {
    createSolanaClient,
    generateKeyPairSigner,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { 
    buildCreateTokenTransaction, 
    buildMintTokensTransaction,
    TOKEN_2022_PROGRAM_ADDRESS,
    getAssociatedTokenAccountAddress 
  } from "gill/programs/token";
  
  /**
   * 🎨 创建 NFT (Non-Fungible Token)
   * 
   * NFT 特点：
   * - 供应量固定为 1
   * - 小数位为 0
   * - 每个 NFT 都有独特的元数据
   * - 不可分割
   */
  
  console.log("🎨 开始创建 NFT...");
  console.log("==================");
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("👤 创建者地址:", signer.address);
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  // 使用 Token 2022 程序创建 NFT
  const tokenProgram = TOKEN_2022_PROGRAM_ADDRESS;
  const mint = await generateKeyPairSigner();
  console.log("🏷️  NFT Mint 地址:", mint.address);
  
  // NFT 元数据 - 每个 NFT 都应该有独特的元数据
  const nftMetadata = {
    isMutable: true,
    name: "UPChain Genesis NFT #001",
    symbol: "UPNFT",
    uri: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/nft-metadata.json",
  };
  
  // 创建 NFT (mint 账户 + metadata)
  console.log("\n🔨 创建 NFT Mint 账户...");
  const createNftTx = await buildCreateTokenTransaction({
    feePayer: signer,
    version: "legacy",
    decimals: 0,          // 🔥 NFT 小数位必须为 0
    metadata: nftMetadata,
    mint,
    latestBlockhash,
    tokenProgram,
    // 💡 为 NFT 设置优先费，确保创建成功 
    computeUnitLimit: 400_000,
    computeUnitPrice: 50_000,
  });
  
  const signedCreateTx = await signTransactionMessageWithSigners(createNftTx);
  
  console.log("🔗 NFT 创建交易链接:");
  console.log(getExplorerLink({
    cluster: "devnet",
    transaction: getSignatureFromTransaction(signedCreateTx),
  }));
  
  try {
    await sendAndConfirmTransaction(signedCreateTx);
    console.log("✅ NFT Mint 账户创建成功!");
  } catch (error) {
    console.error("❌ NFT 创建失败:", error);
    process.exit(1);
  }
  
  // 铸造 NFT (供应量为 1)
  console.log("\n🪙 铸造 NFT...");
  const nftOwner = signer.address; // NFT 所有者（可以改为其他地址）
  
  const mintNftTx = await buildMintTokensTransaction({
    feePayer: signer,
    version: "legacy",
    latestBlockhash,
    amount: 1,            // 🔥 NFT 供应量必须为 1
    destination: nftOwner,
    mint: mint.address,
    mintAuthority: signer,
    tokenProgram,
    // 💡 为铸造设置优先费
    computeUnitLimit: 300_000,
    computeUnitPrice: 50_000,
  });
  
  const signedMintTx = await signTransactionMessageWithSigners(mintNftTx);
  
  console.log("🔗 NFT 铸造交易链接:");
  console.log(getExplorerLink({
    cluster: "devnet",
    transaction: getSignatureFromTransaction(signedMintTx),
  }));
  
  try {
    await sendAndConfirmTransaction(signedMintTx);
    console.log("✅ NFT 铸造成功!");
  } catch (error) {
    console.error("❌ NFT 铸造失败:", error);
    process.exit(1);
  }
  
  // 获取 NFT 所有者的关联代币账户
  const ownerAta = await getAssociatedTokenAccountAddress(
    mint.address, 
    address(nftOwner), 
    tokenProgram
  );
  
  console.log("\n🎉 NFT 创建完成!");
  console.log("=================");
  console.log("🏷️  NFT Mint:", mint.address);
  console.log("👤 所有者:", nftOwner);
  console.log("🏦 代币账户:", ownerAta);
  console.log("🔢 供应量: 1 (固定)");
  console.log("📊 小数位: 0");
  
  // 验证 NFT 余额
  try {
    const { value: nftBalance } = await rpc.getTokenAccountBalance(ownerAta).send();
    console.log("✅ NFT 余额验证:", nftBalance.uiAmountString, nftMetadata.symbol);
  } catch (error) {
    console.log("⚠️  无法验证 NFT 余额（可能需要等待几秒）");
  }
  
  console.log("\n🔗 查看你的 NFT:");
  console.log("=============");
  console.log("Solana Explorer:", `https://explorer.solana.com/address/${mint.address}?cluster=devnet`);
  console.log("元数据信息:", nftMetadata.uri);
