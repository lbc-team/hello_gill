import 'dotenv/config';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  mplTokenMetadata, 
  createNft,
  findMetadataPda,
  findMasterEditionPda,
  verifyCollectionV1
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSignerFromKeypair, 
  signerIdentity, 
  generateSigner, 
  percentAmount 
} from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

/**
 * 🎨 使用 Metaplex UMI 创建完整的 Collection 系统
 * 
 * 此脚本创建：
 * 1. Collection NFT (带 Master Edition)
 * 2. 关联的子 NFT
 * 3. 自动进行 Collection 验证
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

console.log("🎨 Metaplex Collection 创建工具");
console.log("===============================");
console.log("👤 创建者地址:", umiSigner.publicKey);

/**
 * 步骤 1: 创建 Collection NFT
 */
async function createCollectionNft() {
  console.log("\n🏛️ 步骤1: 创建 Collection NFT");
  console.log("============================");
  
  const collectionMint = generateSigner(umi);
  console.log("📍 Collection Mint 地址:", collectionMint.publicKey);
  
  try {
    const result = await createNft(umi, {
      mint: collectionMint,
      name: "UPChain Heroes Collection",
      symbol: "UPHC",
      uri: "https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/collection-metadata.json",
      sellerFeeBasisPoints: percentAmount(5.0), // 5% 版税
      creators: [
        {
          address: umiSigner.publicKey,
          verified: true,
          share: 100,
        },
      ],
      isMutable: true,
      isCollection: true, // 🔥 关键：标记为 Collection
    }).sendAndConfirm(umi);
    
    console.log("✅ Collection NFT 创建成功！");
    console.log("🏷️  Collection Mint:", collectionMint.publicKey);
    console.log("🔗 查看链接:", `https://explorer.solana.com/address/${collectionMint.publicKey}?cluster=devnet`);
    
    // 等待一下账户同步
    console.log("⏱️  等待 3 秒确保账户同步...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 验证 Master Edition 是否创建
    const masterEditionPda = findMasterEditionPda(umi, { 
      mint: collectionMint.publicKey 
    });
    
    try {
      const masterEditionAccount = await umi.rpc.getAccount(masterEditionPda[0]);
      
      if (masterEditionAccount.exists) {
        console.log("✅ Collection Master Edition 创建成功");
        console.log("📍 Master Edition 地址:", masterEditionPda[0]);
      } else {
        console.log("⚠️  Master Edition 账户暂时不可见，但 Collection 已创建");
        console.log("📍 预期 Master Edition 地址:", masterEditionPda[0]);
      }
    } catch (error: any) {
      console.log("⚠️  Master Edition 检查失败，但 Collection 已创建:", error.message);
      console.log("📍 预期 Master Edition 地址:", masterEditionPda[0]);
    }
    
    return collectionMint;
    
  } catch (error: any) {
    console.error("❌ Collection 创建失败:", error.message);
    throw error;
  }
}

/**
 * 步骤 2: 创建关联的 NFT
 */
async function createNftInCollection(collectionMint: any, nftIndex: number) {
  console.log(`\n🎨 创建第 ${nftIndex} 个 NFT`);
  console.log("========================");
  
  const nftMint = generateSigner(umi);
  console.log("📍 NFT Mint 地址:", nftMint.publicKey);
  
  try {
    const result = await createNft(umi, {
      mint: nftMint,
      name: `UPChain Hero #${nftIndex.toString().padStart(3, '0')}`,
      symbol: "UPH",
      uri: `https://raw.githubusercontent.com/lbc-team/hello_gill/refs/heads/main/metadata/hero-${nftIndex.toString().padStart(3, '0')}.json`,
      sellerFeeBasisPoints: percentAmount(5.0),
      creators: [
        {
          address: umiSigner.publicKey,
          verified: true,
          share: 100,
        },
      ],
      collection: {
        key: collectionMint.publicKey, // 🔥 关联到 Collection
        verified: false, // 稍后验证
      },
      isMutable: true,
    }).sendAndConfirm(umi);
    
    console.log("✅ NFT 创建成功！");
    console.log("🏷️  NFT Mint:", nftMint.publicKey);
    console.log("🏛️  Collection:", collectionMint.publicKey);
    console.log("🔗 查看链接:", `https://explorer.solana.com/address/${nftMint.publicKey}?cluster=devnet`);
    
    return nftMint;
    
  } catch (error: any) {
    console.error(`❌ 第 ${nftIndex} 个 NFT 创建失败:`, error.message);
    throw error;
  }
}

/**
 * 步骤 3: 验证 Collection 关系
 */
async function verifyNftInCollection(nftMint: any, collectionMint: any, nftIndex: number) {
  console.log(`\n🔐 验证第 ${nftIndex} 个 NFT 的 Collection 关系`);
  console.log("==========================================");
  
  try {
    const result = await verifyCollectionV1(umi, {
      metadata: findMetadataPda(umi, { mint: nftMint.publicKey })[0],
      collectionMint: collectionMint.publicKey,
      authority: umiSigner,
    }).sendAndConfirm(umi);
    
    console.log("✅ Collection 验证成功！");
    console.log("🎉 NFT 现在正式属于 Collection (verified = true)");
    
    return result;
    
  } catch (error: any) {
    console.error(`❌ 第 ${nftIndex} 个 NFT 验证失败:`, error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 步骤 1: 创建 Collection
    const collectionMint = await createCollectionNft();
    
    console.log("\n⏱️  等待 3 秒确保账户同步...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 步骤 2: 创建多个 NFT
    const nftMints = [];
    const nftCount = 2;
    
    for (let i = 1; i <= nftCount; i++) {
      const nftMint = await createNftInCollection(collectionMint, i);
      nftMints.push(nftMint);
      
      // 添加延迟避免速率限制
      if (i < nftCount) {
        console.log("⏱️  等待 2 秒...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log("\n⏱️  等待 10 秒确保所有账户完全同步...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 步骤 3: 验证所有 NFT
    console.log("\n🔐 开始批量验证 Collection 关系");
    console.log("===============================");
    
    for (let i = 0; i < nftMints.length; i++) {
      await verifyNftInCollection(nftMints[i], collectionMint, i + 1);
      
      if (i < nftMints.length - 1) {
        console.log("⏱️  等待 2 秒...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 总结
    console.log("\n🎉 Collection 系统创建完成！");
    console.log("============================");
    console.log("🏛️  Collection Mint:", collectionMint.publicKey);
    console.log("📊 NFT 数量:", nftMints.length);
    console.log("🏷️  NFT Mints:");
    nftMints.forEach((nft, index) => {
      console.log(`   ${index + 1}. ${nft.publicKey}`);
    });
    
    console.log("\n🔗 Collection 查看链接:");
    console.log(`https://explorer.solana.com/address/${collectionMint.publicKey}?cluster=devnet`);
    
    // 保存地址用于后续脚本
    const addresses = {
      collection: collectionMint.publicKey,
      nfts: nftMints.map(nft => nft.publicKey),
      creator: umiSigner.publicKey,
      timestamp: new Date().toISOString(),
    };
    
    const outputPath = path.join(process.cwd(), 'metaplex-collection-addresses.json');
    fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
    console.log(`\n💾 地址信息保存到: ${outputPath}`);
    
  } catch (error: any) {
    console.error("❌ 创建过程失败:", error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error); 