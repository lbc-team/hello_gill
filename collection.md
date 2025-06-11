/**
 * 🎨 NFT Collection 创建原理详解
 * ==============================
 * 
 * 本文件详细解释 Solana 上 NFT Collection（系列）的创建原理和实现机制
 */

 

/**
 * 🏗️ 1. Collection 架构概述
 * ========================
 * 
 * NFT Collection 由两个主要组件构成：
 * 
 * ┌─────────────────────────────────────────────────────┐
 * │                Collection NFT                       │
 * │                   (父 NFT)                         │
 * │  ┌─────────────────────────────────────────────┐   │
 * │  │ • Mint Address: 唯一标识符                 │   │
 * │  │ • Metadata: 系列基本信息                   │   │
 * │  │ • Authority: 系列管理权限                  │   │
 * │  │ • Size: 系列最大大小(可选)                 │   │
 * │  └─────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────┘
 *                         │
 *                   引用关系
 *                         │
 * ┌─────────────────────────────────────────────────────┐
 * │              Individual NFTs                        │
 * │                 (子 NFT)                           │
 * │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
 * │  │  NFT #1  │ │  NFT #2  │ │  NFT #3  │    ...    │
 * │  │          │ │          │ │          │           │
 * │  │Collection│ │Collection│ │Collection│           │
 * │  │   Key    │ │   Key    │ │   Key    │           │
 * │  └──────────┘ └──────────┘ └──────────┘           │
 * └─────────────────────────────────────────────────────┘
 */

/**
 * 🔗 2. Collection 关联机制
 * ========================
 * 
 * Individual NFT 如何与 Collection 建立关联：
 * 
 * ┌─────────────────────────────────────────────────────┐
 * │           Individual NFT Metadata                   │
 * │  ┌─────────────────────────────────────────────┐   │
 * │  │ {                                           │   │
 * │  │   "name": "UPChain Hero #001",              │   │
 * │  │   "symbol": "UPH",                          │   │
 * │  │   "description": "...",                     │   │
 * │  │   "image": "...",                           │   │
 * │  │   "collection": {                           │   │
 * │  │     "name": "UPChain Heroes",               │   │
 * │  │     "family": "UPChain"                     │   │
 * │  │   },                                        │   │
 * │  │   "属性": [...]                             │   │
 * │  │ }                                           │   │
 * │  └─────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────┘
 *                         +
 * ┌─────────────────────────────────────────────────────┐
 * │          On-Chain Collection Reference              │
 * │  ┌─────────────────────────────────────────────┐   │
 * │  │ {                                           │   │
 * │  │   "key": "Collection_Mint_Address",         │   │
 * │  │   "verified": true/false                    │   │
 * │  │ }                                           │   │
 * │  └─────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────┘
 */

/**
 * 📊 3. 元数据结构对比
 * ==================
 * 
 * Collection NFT 元数据：
 * {
 *   "name": "UPChain Heroes Collection",
 *   "symbol": "UPHC", 
 *   "description": "英雄系列的官方收藏集",
 *   "image": "collection_banner.png",
 *   "external_url": "https://upchain.co/heroes",
 *   "properties": {
 *     "category": "image",
 *     "files": [...],
 *     "creators": [...]
 *   },
 *   "collection": {
 *     "name": "UPChain Heroes Collection",
 *     "family": "UPChain"
 *   }
 * }
 * 
 * Individual NFT 元数据：
 * {
 *   "name": "UPChain Hero #001",
 *   "symbol": "UPH",
 *   "description": "勇敢的战士，拥有火焰之力",
 *   "image": "hero_001.png",
 *   "attributes": [
 *     {"trait_type": "Rarity", "value": "Legendary"},
 *     {"trait_type": "Element", "value": "Fire"},
 *     {"trait_type": "Power", "value": 95}
 *   ],
 *   "collection": {
 *     "name": "UPChain Heroes Collection",
 *     "family": "UPChain"
 *   }
 * }
 */

/**
 * 🔐 4. Collection 验证流程
 * =======================
 * 
 * 步骤1: 创建 Collection NFT
 * ┌─────────────────────────────────────────────────────┐
 * │ • createMint() - 创建 Collection Mint 账户         │
 * │ • createMetadata() - 创建 Collection 元数据        │ 
 * │ • mintTo() - 铸造 Collection NFT (供应量=1)        │
 * └─────────────────────────────────────────────────────┘
 *                         ↓
 * 步骤2: 创建 Individual NFTs
 * ┌─────────────────────────────────────────────────────┐
 * │ FOR 每个 NFT:                                       │
 * │ • createMint() - 创建 NFT Mint 账户                │
 * │ • createMetadata() - 创建 NFT 元数据 (包含 collection) │
 * │ • mintTo() - 铸造 NFT (供应量=1)                   │
 * └─────────────────────────────────────────────────────┘
 *                         ↓
 * 步骤3: 验证 Collection 关系 (可选但推荐)
 * ┌─────────────────────────────────────────────────────┐
 * │ • verifyCollection() - 验证 NFT 属于该 Collection   │
 * │ • setCollectionSize() - 设置 Collection 大小       │
 * │ • 将 verified 字段设为 true                        │
 * └─────────────────────────────────────────────────────┘
 */

/**
 * 🛠️ 5. 技术实现要点
 * ==================
 * 
 * 5.1 Collection NFT 特征：
 * • 供应量: 1 (固定)
 * • 小数位: 0 (不可分割) 
 * • 元数据: 包含系列信息
 * • 权限: Collection Authority (可选)
 * 
 * 5.2 Individual NFT 特征：
 * • 供应量: 1 (固定)
 * • 小数位: 0 (不可分割)
 * • 元数据: 引用 Collection + 独特属性
 * • Collection Key: 指向 Collection Mint
 * 
 * 5.3 关键指令：
 * • CreateMetadataAccountV3: 创建元数据
 * • VerifyCollection: 验证 Collection 关系
 * • SetAndVerifyCollection: 设置并验证 Collection
 * • UnverifyCollection: 取消验证
 * • SetCollectionSize: 设置 Collection 大小
 */

/**
 * 🎯 6. Collection 的优势
 * ======================
 * 
 * 6.1 对创作者：
 * • 品牌统一: 所有 NFT 归属同一系列
 * • 批量管理: 可以批量操作系列中的 NFT
 * • 版税控制: 统一的版税设置
 * • 稀缺性: 明确的系列大小和稀有度
 * 
 * 6.2 对用户/收藏者：
 * • 清晰分类: 钱包中按系列分组显示
 * • 真实性验证: verified 标记确保 NFT 真实性
 * • 完整收藏: 可以追踪收藏完整性
 * • 市场价值: 系列的声誉影响个体价值
 * 
 * 6.3 对市场/平台：
 * • 分组展示: 按 Collection 组织 NFT
 * • 筛选功能: 支持按系列筛选
 * • 统计分析: 系列级别的交易数据
 * • 推荐算法: 基于系列的推荐
 */

/**
 * 📈 7. Collection 最佳实践
 * ========================
 * 
 * 7.1 命名规范：
 * • Collection: "项目名称 Collection"
 * • Individual: "项目名称 #编号"
 * • Symbol: 简短且具有标识性
 * 
 * 7.2 元数据设计：
 * • 统一的属性结构
 * • 清晰的稀有度定义
 * • 高质量的图片资源
 * • 详细的描述信息
 * 
 * 7.3 技术要点：
 * • 始终验证 Collection 关系
 * • 设置合理的 Collection Size
 * • 保留必要的管理权限
 * • 考虑未来的升级需求
 * 
 * 7.4 法律和商业考虑：
 * • 版权和知识产权保护
 * • 明确的使用条款
 * • 合理的版税设置
 * • 社区治理机制
 */

 
/**
 * 🔗 参考资源
 * ===========
 * 
 * • Metaplex Docs: https://docs.metaplex.com/
 * • Token Metadata Standard: https://docs.metaplex.com/programs/token-metadata/
 * • Solana Cookbook: https://solanacookbook.com/references/nfts.html
 * • SPL Token Program: https://spl.solana.com/token
 */ 