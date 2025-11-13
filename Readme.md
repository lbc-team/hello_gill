
参考视频：https://learnblockchain.cn/video/play/1248
参考代码：https://github.com/solana-foundation/gill/tree/master/examples/tokens



## 工程初始化

hello_gill 是一个 TypeScript 工程

```
mkdir hello_gill
cd hello_gill

nvm use 22

pnpm install


# 或自己安装一下依赖
# https://github.com/solana-foundation/gill
pnpm add gill esrun dotenv 
pnpm add @types/node typescript

```

## 功能介绍：

### 0_account.ts
账号加载及获取余额

### 0_transfer_sol.ts：

Sol 转账交易

### 1_create_token.ts

创建 Token （Mint）， 默认是没有 Meta 信息的, 例如：[这个Token](https://explorer.solana.com/address/4fzXpMnMK3xc6wGf9xuLg56gVCqKXeQybEJ4x3jEXc9X?cluster=devnet) , Mint 账户记录着这些信息：
decimals : 小数位数 
supply： 当前总供应量
mint_authority: 铸造权限， 谁可以发行 token 
freeze_authority: 冻结权限：冻结或解冻某个账户的 Token， 防止该账户进行转账或接收 Token。

结构定义参考：
https://github.com/solana-program/token/blob/main/program/src/state.rs

Mint 账户代表着 token 的“身份”， SPL Token 相关程序（比如钱包、DEX、DeFi）都以 mint 为判断 token 类型的依据。


### src/1_easy_create_token.ts

使用 gill/programs/token 提供的 buildCreateTokenTransaction 来创建 Token , 例如这个 [Token](https://explorer.solana.com/address/CT1RcDHat3KZpg3kkj3MCQuMP7xduLRgk1QRyySnSdKL?cluster=devnet)



###  1_create_token_with_metadata.ts


创建 Token 有 Meta 信息（注意Token 名称等信息，不是唯一的）
例如[这个 Token](https://explorer.solana.com/address/GkoTqdPyXFnEg27ZrRZbd5D1Hgb2M76aQ44Ed9vqZLot/metadata?cluster=devnet) .

SPL Token 默认是没有 Meta 信息的，惯例是使用 Metaplex 的 Token Metadata Program , 通过 mint 账户作为seed ，创建 metadatePDA 账户来保存


| 字段                        | 描述                                   |
| ------------------------- | ------------------------------------ |
| `name`                    | Token 全称，例如：`USD Coin`               |
| `symbol`                  | 简写，例如：`USDC`                         |
| `uri`                     | 指向 JSON 文件的 URL，JSON 中可包含图标、描述、官网链接等 |
| `creators`                | Token 创作者列表（可选）                      |
| `collection`              | 可选绑定到 NFT 集合                         |
| `seller_fee_basis_points` | 用于 NFT 收费的费率（通常为 0）                  |


### src/1_easy_create_token2022.ts

使用 gill/programs/token 提供的 buildCreateTokenTransaction 来创建 Token2022, 例如这个 [Token](https://explorer.solana.com/address/2WGmr7AmXgFnonvHCDiu4GMaHtHxiVfa53rMv3CnNGXf?cluster=devnet)

### 2_mint_token.ts

铸造 Token， 先创建 ata account (使用 CreateIdempotent 指令，如果账户已经存在，什么都不做) ， 然后铸造 Token， 参考[tx1](https://explorer.solana.com/tx/8jzbfVB2VFJ5Sa8ppWPevkxnVGm2mdFy9qFsqmjEKA1CyyyXjLoQY3Z9CpQv2sFFPkTEwJRMeYuM45hRP2MJy66?cluster=devnet) , [tx2](https://explorer.solana.com/tx/2YEahcxkePScbNZUkncY5pq53vK6ao1Mu3ALRhNn8qQnASES9TKetv2axrYyna8NB9bnpPTqPW3Ga82JFQgJXi7G?cluster=devnet)

### 2_easy_mint_token.ts

铸造 Token , mint_token.ts 的更简单版本，使用一个方法： `buildMintTokensTransaction`

### src/3_transfer_token.ts 和 3_easy_transfer_token.ts

Token 转账

### src/4_create_nft.ts

NFT 创建铸造

### src/4_create_nft_collection.ts

NFT 合集及合集内 NFT  创建铸造转账。
gill 目前的版本创建的 NFT 没法通过Collection 验证， 通过 4_diagnose_collection.ts 排查，发现原因是  gill 无法创建 Master Edition 账户 。

Master Edition 账户： 表示唯一原始版本（或源 NFT），也是作为 NFT 集合（Collection）的标识。
普通的 Edition 账户则表示复制品或印刷品。

### src/5_create_metaplex_collection.ts

创建NFT合集及合集内NFT, 并验证。
这里是一个[示例](https://explorer.solana.com/address/9PqzLS9hETdB9MkNJMQz5DjnjQKdLEWEqStuS66SjzX4?cluster=devnet)

相关地址参考： metaplex-collection-addresses.json

## 运行

pnpx esrun 加文件名：

```
pnpx esrun ./src/0_transfer_sol.ts
```

