import 'dotenv/config';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, findMetadataPda, fetchMetadata, findMasterEditionPda } from '@metaplex-foundation/mpl-token-metadata';
import { createSignerFromKeypair, signerIdentity, publicKey } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

/**
 * 分析为什么 Collection 验证会出现 "Incorrect account owner" 错误
 */

const cluster = process.env.DEVNET_RPC || "devnet";

// 初始化 UMI
const rpcUrl = cluster === "devnet" ? "https://api.devnet.solana.com" : 
               cluster === "testnet" ? "https://api.testnet.solana.com" :
               cluster === "mainnet" ? "https://api.mainnet-beta.solana.com" : cluster;

const umi = createUmi(rpcUrl).use(mplTokenMetadata());

// 加载钱包
function loadKeypairFromFile(): Keypair {
  const keypairPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`钱包文件不存在: ${keypairPath}`);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(keypairData));
}

// 设置钱包签名者
const keypair = loadKeypairFromFile();
const umiKeypair = fromWeb3JsKeypair(keypair);
const umiSigner = createSignerFromKeypair(umi, umiKeypair);
umi.use(signerIdentity(umiSigner));

console.log("🔍 钱包地址:", umiSigner.publicKey);

/**
 * 诊断单个 NFT 的问题
 */
async function diagnoseNft(nftMintAddress: string, collectionMintAddress: string) {
  console.log(`\n🔍 诊断 NFT: ${nftMintAddress}`);
  console.log(`🏛️  Collection: ${collectionMintAddress}`);
  
  try {
    // 1. 检查 NFT Mint 账户
    console.log("\n--- 步骤1: 检查 NFT Mint 账户 ---");
    const nftMint = await umi.rpc.getAccount(publicKey(nftMintAddress));
    if (nftMint.exists) {
      console.log("✅ NFT Mint 账户存在");
      console.log(`   Owner: ${nftMint.owner}`);
      console.log(`   Data length: ${nftMint.data.length}`);
    } else {
      console.log("❌ NFT Mint 账户不存在");
      return;
    }
    
    // 2. 检查 Collection Mint 账户
    console.log("\n--- 步骤2: 检查 Collection Mint 账户 ---");
    const collectionMint = await umi.rpc.getAccount(publicKey(collectionMintAddress));
    if (collectionMint.exists) {
      console.log("✅ Collection Mint 账户存在");
      console.log(`   Owner: ${collectionMint.owner}`);
      console.log(`   Data length: ${collectionMint.data.length}`);
    } else {
      console.log("❌ Collection Mint 账户不存在");
      return;
    }
    
    // 3. 获取并检查 NFT Metadata PDA
    console.log("\n--- 步骤3: 检查 NFT Metadata 账户 ---");
    const nftMetadataPda = findMetadataPda(umi, { 
      mint: publicKey(nftMintAddress)
    });
    console.log(`   计算的 Metadata PDA: ${nftMetadataPda}`);
    
    const nftMetadataAccount = await umi.rpc.getAccount(nftMetadataPda[0]);
    if (nftMetadataAccount.exists) {
      console.log("✅ NFT Metadata 账户存在");
      console.log(`   Owner: ${nftMetadataAccount.owner}`);
      console.log(`   Data length: ${nftMetadataAccount.data.length}`);
      
      // 尝试获取 metadata 数据
      try {
        const nftMetadata = await fetchMetadata(umi, nftMetadataPda[0]);
        console.log("✅ 成功解析 NFT Metadata:");
        console.log(`   Name: ${nftMetadata.name}`);
        console.log(`   Symbol: ${nftMetadata.symbol}`);
        console.log(`   Update Authority: ${nftMetadata.updateAuthority}`);
        console.log(`   Mint: ${nftMetadata.mint}`);
        
        if (nftMetadata.collection && nftMetadata.collection.__option === 'Some') {
          console.log("✅ NFT 有 Collection 信息:");
          console.log(`   Collection Key: ${nftMetadata.collection.value.key}`);
          console.log(`   Verified: ${nftMetadata.collection.value.verified}`);
        } else {
          console.log("❌ NFT 没有 Collection 信息");
        }
      } catch (error: any) {
        console.log("❌ 无法解析 NFT Metadata:", error.message);
      }
    } else {
      console.log("❌ NFT Metadata 账户不存在");
      return;
    }
    
    // 4. 获取并检查 Collection Metadata PDA
    console.log("\n--- 步骤4: 检查 Collection Metadata 账户 ---");
    const collectionMetadataPda = findMetadataPda(umi, { 
      mint: publicKey(collectionMintAddress)
    });
    console.log(`   计算的 Collection Metadata PDA: ${collectionMetadataPda[0]}`);
    
    const collectionMetadataAccount = await umi.rpc.getAccount(collectionMetadataPda[0]);
    if (collectionMetadataAccount.exists) {
      console.log("✅ Collection Metadata 账户存在");
      console.log(`   Owner: ${collectionMetadataAccount.owner}`);
      console.log(`   Data length: ${collectionMetadataAccount.data.length}`);
      
      // 尝试获取 collection metadata 数据
      try {
        const collectionMetadata = await fetchMetadata(umi, collectionMetadataPda[0]);
        console.log("✅ 成功解析 Collection Metadata:");
        console.log(`   Name: ${collectionMetadata.name}`);
        console.log(`   Symbol: ${collectionMetadata.symbol}`);
        console.log(`   Update Authority: ${collectionMetadata.updateAuthority}`);
        console.log(`   Mint: ${collectionMetadata.mint}`);
      } catch (error: any) {
        console.log("❌ 无法解析 Collection Metadata:", error.message);
      }
    } else {
      console.log("❌ Collection Metadata 账户不存在");
      return;
    }
    
    // 5. 🔥 检查 Collection Master Edition 账户（新增）
    console.log("\n--- 步骤5: 检查 Collection Master Edition 账户 ---");
    const collectionMasterEditionPda = findMasterEditionPda(umi, { 
      mint: publicKey(collectionMintAddress)
    });
    console.log(`   计算的 Collection Master Edition PDA: ${collectionMasterEditionPda[0]}`);
    
    const collectionMasterEditionAccount = await umi.rpc.getAccount(collectionMasterEditionPda[0]);
    if (collectionMasterEditionAccount.exists) {
      console.log("✅ Collection Master Edition 账户存在");
      console.log(`   Owner: ${collectionMasterEditionAccount.owner}`);
      console.log(`   Data length: ${collectionMasterEditionAccount.data.length}`);
    } else {
      console.log("❌ Collection Master Edition 账户不存在");
      console.log("💡 这是验证失败的原因！Collection 需要 Master Edition 才能进行验证");
    }
    
    // 6. 权限检查
    console.log("\n--- 步骤6: 权限检查 ---");
    console.log(`   当前签名者: ${umiSigner.publicKey}`);
    
    try {
      const collectionMetadata = await fetchMetadata(umi, collectionMetadataPda[0]);
      const nftMetadata = await fetchMetadata(umi, nftMetadataPda[0]);
      
      console.log(`   Collection Update Authority: ${collectionMetadata.updateAuthority}`);
      console.log(`   NFT Update Authority: ${nftMetadata.updateAuthority}`);
      
      if (collectionMetadata.updateAuthority === umiSigner.publicKey) {
        console.log("✅ 签名者是 Collection 的 Update Authority");
      } else {
        console.log("❌ 签名者不是 Collection 的 Update Authority");
        console.log("💡 这可能是验证失败的原因！");
      }
      
      // 检查 Collection 关系
      if (nftMetadata.collection && nftMetadata.collection.__option === 'Some') {
        if (nftMetadata.collection.value.key === collectionMintAddress) {
          console.log("✅ NFT 的 Collection Key 匹配");
        } else {
          console.log("❌ NFT 的 Collection Key 不匹配");
          console.log(`   期望: ${collectionMintAddress}`);
          console.log(`   实际: ${nftMetadata.collection.value.key}`);
        }
      } else {
        console.log("❌ NFT 没有 Collection 信息");
        console.log(`   实际: undefined`);
      }
    } catch (error: any) {
      console.log("❌ 权限检查失败:", error.message);
    }
    
    // 7. 程序检查
    console.log("\n--- 步骤7: 程序检查 ---");
    const expectedMetadataProgram = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
    
    if (nftMetadataAccount.owner === expectedMetadataProgram) {
      console.log("✅ NFT Metadata 账户的 Owner 是正确的 Token Metadata 程序");
    } else {
      console.log("❌ NFT Metadata 账户的 Owner 不正确");
      console.log(`   期望: ${expectedMetadataProgram}`);
      console.log(`   实际: ${nftMetadataAccount.owner}`);
      console.log("💡 这是 'Incorrect account owner' 错误的原因！");
    }
    
    if (collectionMetadataAccount.owner === expectedMetadataProgram) {
      console.log("✅ Collection Metadata 账户的 Owner 是正确的 Token Metadata 程序");
    } else {
      console.log("❌ Collection Metadata 账户的 Owner 不正确");
      console.log(`   期望: ${expectedMetadataProgram}`);
      console.log(`   实际: ${collectionMetadataAccount.owner}`);
      console.log("💡 这是 'Incorrect account owner' 错误的原因！");
    }
    
  } catch (error: any) {
    console.error("❌ 诊断过程中出现错误:", error.message);
  }
}

// 主函数
async function main() {
  console.log("🔍 Collection 问题诊断工具");
  console.log("============================");
  
  // 使用最新的地址（最新 Metaplex 创建的版本）
  const COLLECTION_MINT = "1wTrDhvzskzTLBbTyQ2MrdWeUntzSB6zv6hBgU2Lu3J";
  const NFT_MINTS = [
    "ALqr9w3xnTXXgxqdDt3zkNmpQ4yFrjDnuBE486wugpi7",
    "E1wWkATW5kJJJEqzZG1YDqnvrE7aPDzd4GzvVTbBjbWd",
  ];
  
  console.log(`📊 诊断信息:`);
  console.log(`   Collection Mint: ${COLLECTION_MINT}`);
  console.log(`   NFT 数量: ${NFT_MINTS.length}`);
  console.log(`   RPC 端点: ${rpcUrl}`);
  
  for (let i = 0; i < NFT_MINTS.length; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`诊断第 ${i + 1}/${NFT_MINTS.length} 个 NFT`);
    console.log(`${"=".repeat(60)}`);
    
    await diagnoseNft(NFT_MINTS[i], COLLECTION_MINT);
    
    if (i < NFT_MINTS.length - 1) {
      console.log("\n⏱️  等待 2 秒后继续...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log("🎯 诊断总结");
  console.log(`${"=".repeat(60)}`);
  console.log("💡 常见的 'Incorrect account owner' 原因:");
  console.log("   1. Metadata 账户的 owner 不是 Token Metadata 程序");
  console.log("   2. 使用了错误的 Update Authority");
  console.log("   3. Collection 和 NFT 是用不同的程序创建的");
  console.log("   4. 账户地址计算错误");
  console.log("   5. gill 和 Metaplex SDK 的兼容性问题");
}

// 直接运行主函数
main().catch(console.error); 