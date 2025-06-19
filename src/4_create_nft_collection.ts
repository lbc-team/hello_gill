import 'dotenv/config';
import {
    createSolanaClient,
    generateKeyPairSigner,
    getExplorerLink,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
    createTransaction,
    getMinimumBalanceForRentExemption,
  } from "gill";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { 
    buildCreateTokenTransaction, 
    buildMintTokensTransaction,
    TOKEN_PROGRAM_ADDRESS,
    getAssociatedTokenAccountAddress,
    getInitializeMintInstruction,
    getMintSize,
  } from "gill/programs/token";
  import {
    getCreateAccountInstruction,
    getCreateMetadataAccountV3Instruction,
    getTokenMetadataAddress,
  } from "gill/programs";

  
  /**
   * Collection 合集创建
   * 
   * Collection 架构：
   * 1. Collection NFT - 代表整个系列
   * 2. 子NFTs - 每个都引用 Collection MINT NFT
   * 3. 链上验证关系 - Collection Key + verified 状态
   * 
   */
  
  const cluster = process.env.DEVNET_RPC || "devnet";
  const { rpc, sendAndConfirmTransaction } = createSolanaClient({
    urlOrMoniker: cluster,
  });
  
  const signer = await loadKeypairSignerFromFile();
  
  // Collection 配置
  const collectionConfig = {
    name: "UPChain Heroes Collection",
    symbol: "UPHC",
    description: "UPChain 系列收藏集",
    image: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/collection-banner.png",
    totalSize: 2, // 这个 Collection 最多包含100个 NFT
  };


  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tokenProgram = TOKEN_PROGRAM_ADDRESS;
  
  // 步骤1: 创建 Collection NFT (父级)
  console.log("\n🏛️ 步骤1: 创建 Collection NFT");
  console.log("=====================================");
  
  const collectionMint = await generateKeyPairSigner();
  console.log("📍 Collection Mint 地址:", collectionMint.address);
  
  // Collection NFT 元数据: https://developers.metaplex.com/token-metadata/token-standard
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
    });
    
    const signedMintCollectionTx = await signTransactionMessageWithSigners(mintCollectionTx);
    await sendAndConfirmTransaction(signedMintCollectionTx);
    console.log("✅ Collection NFT 铸造成功");
    console.log("   🔗 查看链接:", `https://explorer.solana.com/address/${collectionMint.address}?cluster=devnet`);
    
  } catch (error) {
    console.error("❌ Collection NFT 创建失败:", error);
    process.exit(1);
  }
  
  // 步骤2: 创建单个 NFT (在 Collection 中)
  console.log("\n👥 步骤2: 创建单个 NFT (在 Collection 中)");
  console.log("===================================");
  

  for (let i = 0; i < 2; i++) {
    // Individual NFT 元数据 - 包含 Collection 引用
    const nftMetadata = {
      isMutable: true,
      name: "UPChain Hero #00" + (i + 1),
      symbol: "UPH", // Individual NFT 符号
      uri: `https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/hero-${(i + 1).toString().padStart(3, '0')}.json`,
    };
    
    try {
      // 创建 Individual NFT Mint 账户（带 Collection 引用）
      console.log("   🔨 创建 NFT Mint...");
      
      const nftMint = await generateKeyPairSigner();
      
      try {
        // 创建 NFT 带 Collection 关系 - 使用手动指令创建
        console.log("   📝 准备创建 NFT 交易（带 Collection 关系）...");
        
        // 获取 NFT metadata 地址
        const nftMetadataAddress = await getTokenMetadataAddress(address(nftMint.address));
        const space = getMintSize();
        
        const createNftTx = createTransaction({
          feePayer: signer,
          version: "legacy",
          instructions: [
            // 创建 mint 账户
            getCreateAccountInstruction({
              space,
              lamports: getMinimumBalanceForRentExemption(space),
              newAccount: nftMint,
              payer: signer,
              programAddress: tokenProgram,
            }),
            // 初始化 mint
            getInitializeMintInstruction(
              {
                mint: nftMint.address,
                mintAuthority: signer.address,
                freezeAuthority: signer.address,
                decimals: 0, // NFT 标准
              },
              {
                programAddress: tokenProgram,
              },
            ),
            // 创建 metadata 并设置 collection
            getCreateMetadataAccountV3Instruction({
              collectionDetails: null,
              isMutable: true,
              updateAuthority: signer,
              mint: nftMint.address,
              metadata: nftMetadataAddress,
              mintAuthority: signer,
              payer: signer,
              data: {
                sellerFeeBasisPoints: 0,
                collection: {
                  key: address(collectionMint.address),
                  verified: false  
                },
                creators: null,
                uses: null,
                name: nftMetadata.name,
                symbol: nftMetadata.symbol,
                uri: nftMetadata.uri,
              },
            }),
          ],
          latestBlockhash,
        });
        
        const signedCreateNftTx = await signTransactionMessageWithSigners(createNftTx);
        await sendAndConfirmTransaction(signedCreateNftTx);
        console.log("   ✅ NFT Mint 和 Metadata 创建成功（已关联 Collection）");
      } catch (error: any) {
        console.error("   ❌ 创建 NFT 失败:", error);
        if (error.logs) {
          console.error("   📜 错误日志:", error.logs);
        }
        throw error;
      }
      
      try {
        // 铸造 Individual NFT
        console.log("   🪙 准备铸造 NFT...");
        const mintNftTx = await buildMintTokensTransaction({
          feePayer: signer,
          version: "legacy",
          latestBlockhash,
          amount: 1,
          destination: address(signer.address),
          mint: address(nftMint.address),
          mintAuthority: signer,
          tokenProgram,
        });
        
        const signedMintNftTx = await signTransactionMessageWithSigners(mintNftTx);
        await sendAndConfirmTransaction(signedMintNftTx);
        console.log("   ✅ NFT 铸造成功");
        console.log("      🏷️  NFT Mint:", nftMint.address);
        console.log("      🏛️  Collection Mint:", collectionMint.address);
        console.log("      🔗 查看链接:", `https://explorer.solana.com/address/${nftMint.address}?cluster=devnet`);
      } catch (error: any) {
        console.error("   ❌ 铸造 NFT 失败:", error);
        throw error;
      }
      
    } catch (error) {
      continue;
    }
    
  }
  