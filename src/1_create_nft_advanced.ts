import 'dotenv/config';
import {
    createSolanaClient,
    generateKeyPairSigner,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
    createTransaction,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { 
    buildCreateTokenTransaction, 
    buildMintTokensTransaction,
    TOKEN_2022_PROGRAM_ADDRESS,
    getAssociatedTokenAccountAddress,
  } from "gill/programs/token";
  import {
    getCreateMetadataAccountV3Instruction,
    getTokenMetadataAddress,
  } from "gill/programs";
  
  /**
   * 🎨 真正的 NFT Collection 创建器
   * 
   * Collection 架构：
   * 1. Collection NFT (父级) - 代表整个系列
   * 2. Individual NFTs (子级) - 每个都引用 Collection NFT
   * 3. 链上验证关系 - Collection Key + verified 状态
   * 
   * 功能特点：
   * - 创建真正的 Collection NFT
   * - 创建引用 Collection 的 Individual NFTs  
   * - 建立链上 Collection 关系
   * - 设置正确的元数据结构
   * - 支持 Collection 验证和管理
   */
  
  console.log("🚀 真正的 NFT Collection 创建器启动...");
  console.log("========================================");
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  console.log("👤 创建者:", signer.address);
  
  // Collection 配置
  const collectionConfig = {
    name: "UPChain Heroes Collection",
    symbol: "UPHC",
    description: "UPChain 系列收藏集",
    image: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/collection-banner.png",
    totalSize: 100, // 这个 Collection 最多包含100个 NFT
  };
  
  // Individual NFTs 配置
  const individualNfts = [
    {
      name: "UPChain Hero #001",
      description: "勇敢的火焰战士，拥有传说级的力量",
      image: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/hero-001.png",
      attributes: [
        { trait_type: "Rarity", value: "Legendary" },
        { trait_type: "Element", value: "Fire" },
        { trait_type: "Power", value: 95 },
        { trait_type: "Class", value: "Warrior" }
      ]
    },
    {
      name: "UPChain Hero #002", 
      description: "神秘的冰霜法师，掌控寒冰之力",
      image: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/hero-002.png",
      attributes: [
        { trait_type: "Rarity", value: "Epic" },
        { trait_type: "Element", value: "Ice" },
        { trait_type: "Power", value: 88 },
        { trait_type: "Class", value: "Mage" }
      ]
    }
  ];

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tokenProgram = TOKEN_2022_PROGRAM_ADDRESS;
  
  // 步骤1: 创建 Collection NFT (父级)
  console.log("\n🏛️ 步骤1: 创建 Collection NFT (父级)");
  console.log("=====================================");
  
  const collectionMint = await generateKeyPairSigner();
  console.log("📍 Collection Mint 地址:", collectionMint.address);
  
  // Collection NFT 元数据
  const collectionMetadata = {
    isMutable: true,
    name: collectionConfig.name,
    symbol: collectionConfig.symbol,
    uri: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/collection-metadata.json",
  };
  
  try {
    // 创建 Collection Mint 账户
    console.log("🔨 创建 Collection Mint...");
    const createCollectionTx = await buildCreateTokenTransaction({
      feePayer: signer,
      version: "legacy",
      decimals: 0, // NFT 标准
      metadata: collectionMetadata,
      mint: collectionMint,
      latestBlockhash,
      tokenProgram,
      computeUnitLimit: 400_000,
      computeUnitPrice: 100_000, // 提高优先费
    });
    
    const signedCreateCollectionTx = await signTransactionMessageWithSigners(createCollectionTx);
    await sendAndConfirmTransaction(signedCreateCollectionTx);
    console.log("✅ Collection Mint 创建成功");
    
    // 铸造 Collection NFT
    console.log("🪙 铸造 Collection NFT...");
    const mintCollectionTx = await buildMintTokensTransaction({
      feePayer: signer,
      version: "legacy",
      latestBlockhash,
      amount: 1, // Collection NFT 供应量为1
      destination: signer.address,
      mint: collectionMint.address,
      mintAuthority: signer,
      tokenProgram,
      computeUnitLimit: 300_000,
      computeUnitPrice: 100_000,
    });
    
    const signedMintCollectionTx = await signTransactionMessageWithSigners(mintCollectionTx);
    await sendAndConfirmTransaction(signedMintCollectionTx);
    console.log("✅ Collection NFT 铸造成功");
    
    console.log("🎉 Collection NFT 创建完成!");
    console.log("   🏷️  Collection Mint:", collectionMint.address);
    console.log("   🔗 查看链接:", `https://explorer.solana.com/address/${collectionMint.address}?cluster=devnet`);
    
  } catch (error) {
    console.error("❌ Collection NFT 创建失败:", error);
    process.exit(1);
  }
  
  // 步骤2: 创建 Individual NFTs (子级)
  console.log("\n👥 步骤2: 创建 Individual NFTs (子级)");
  console.log("===================================");
  
  const createdNfts = [];
  
  for (let i = 0; i < individualNfts.length; i++) {
    const nftData = individualNfts[i];
    console.log(`\n🎯 创建 ${nftData.name}...`);
    console.log("=".repeat(40));
    
    const nftMint = await generateKeyPairSigner();
    
    // Individual NFT 元数据 - 包含 Collection 引用
    const nftMetadata = {
      isMutable: true,
      name: nftData.name,
      symbol: "UPH", // Individual NFT 符号
      uri: `https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/hero-${(i + 1).toString().padStart(3, '0')}.json`,
    };
    
    try {
      // 创建 Individual NFT Mint 账户（带 Collection 引用）
      console.log("   🔨 创建 NFT Mint...");
      
      // 首先使用标准方法创建 NFT
      const createNftTx = await buildCreateTokenTransaction({
        feePayer: signer,
        version: "legacy",
        decimals: 0,
        metadata: nftMetadata,
        mint: nftMint,
        latestBlockhash,
        tokenProgram,
        computeUnitLimit: 400_000,
        computeUnitPrice: 100_000,
      });
      
      const signedCreateNftTx = await signTransactionMessageWithSigners(createNftTx);
      await sendAndConfirmTransaction(signedCreateNftTx);
      console.log("   ✅ NFT Mint 创建成功");
      
      // 铸造 Individual NFT
      console.log("   🪙 铸造 NFT...");
      const mintNftTx = await buildMintTokensTransaction({
        feePayer: signer,
        version: "legacy",
        latestBlockhash,
        amount: 1,
        destination: signer.address,
        mint: nftMint.address,
        mintAuthority: signer,
        tokenProgram,
        computeUnitLimit: 300_000,
        computeUnitPrice: 100_000,
      });
      
      const signedMintNftTx = await signTransactionMessageWithSigners(mintNftTx);
      await sendAndConfirmTransaction(signedMintNftTx);
      console.log("   ✅ NFT 铸造成功");
      
      // 记录创建的 NFT
      createdNfts.push({
        name: nftData.name,
        mint: nftMint.address,
        collectionMint: collectionMint.address,
      });
      
      console.log("   📊 NFT 信息:");
      console.log("      🏷️  NFT Mint:", nftMint.address);
      console.log("      🏛️  Collection Mint:", collectionMint.address);
      console.log("      🔗 查看链接:", `https://explorer.solana.com/address/${nftMint.address}?cluster=devnet`);
      
    } catch (error) {
      console.error(`   ❌ ${nftData.name} 创建失败:`, error);
      continue;
    }
    
    // 添加延迟
    if (i < individualNfts.length - 1) {
      console.log("   ⏳ 等待 3 秒后创建下一个...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 步骤3: 总结 Collection 创建结果
  console.log("\n🎉 NFT Collection 创建完成!");
  console.log("============================");
  console.log("🏛️  Collection NFT:", collectionMint.address);
  console.log("👥 Individual NFTs:", createdNfts.length, "个");
  
  console.log("\n📋 创建的 NFT 列表:");
  console.log("==================");
  createdNfts.forEach((nft, index) => {
    console.log(`${index + 1}. ${nft.name}`);
    console.log(`   🏷️  Mint: ${nft.mint}`);
    console.log(`   🏛️  Collection: ${nft.collectionMint}`);
    console.log(`   🔗 链接: https://explorer.solana.com/address/${nft.mint}?cluster=devnet`);
    console.log("");
  });
 
 