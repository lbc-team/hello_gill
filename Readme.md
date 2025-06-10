
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

### transfer_sol.ts：

Sol 转账交易

### create_token.ts

创建 Token （Mint）， 默认是没有 Meta 信息的, 例如：[这个Token](https://explorer.solana.com/address/4fzXpMnMK3xc6wGf9xuLg56gVCqKXeQybEJ4x3jEXc9X?cluster=devnet) , Mint 账户记录着这些信息：
decimals : 小数位数 
supply： 当前总供应量
mint_authority: 铸造权限， 谁可以发行 token 
freeze_authority: 冻结权限：冻结或解冻某个账户的 Token， 防止该账户进行转账或接收 Token。

结构定义参考：
https://github.com/solana-program/token/blob/main/program/src/state.rs

Mint 账户代表着 token 的“身份”， SPL Token 相关程序（比如钱包、DEX、DeFi）都以 mint 为判断 token 类型的依据。

###  create_token_with_metadata.ts


创建 Token 有 Meta 信息（注意Token 名称等信息，不是唯一的）
例如[这个 Token](https://explorer.solana.com/address/GkoTqdPyXFnEg27ZrRZbd5D1Hgb2M76aQ44Ed9vqZLot/metadata?cluster=devnet) .

SPL Token 默认是没有Meta 信息的，惯例是使用 Metaplex 的 Token Metadata Program , 通过 mint 账户，创建 mintPDA 账户来保存


| 字段                        | 描述                                   |
| ------------------------- | ------------------------------------ |
| `name`                    | Token 全称，例如：`USD Coin`               |
| `symbol`                  | 简写，例如：`USDC`                         |
| `uri`                     | 指向 JSON 文件的 URL，JSON 中可包含图标、描述、官网链接等 |
| `creators`                | Token 创作者列表（可选）                      |
| `collection`              | 可选绑定到 NFT 集合                         |
| `seller_fee_basis_points` | 用于 NFT 收费的费率（通常为 0）                  |

### src/easy_create_token.ts

使用 gill/programs/token 提供的 buildCreateTokenTransaction 来创建 Token , 例如这个 [Token](https://explorer.solana.com/address/CT1RcDHat3KZpg3kkj3MCQuMP7xduLRgk1QRyySnSdKL?cluster=devnet)


### src/easy_create_token2022.ts

使用 gill/programs/token 提供的 buildCreateTokenTransaction 来创建 Token2022, 例如这个 [Token](https://explorer.solana.com/address/2WGmr7AmXgFnonvHCDiu4GMaHtHxiVfa53rMv3CnNGXf?cluster=devnet)

## 运行

pnpx esrun 加文件名：

```
pnpx esrun ./src/transfer_sol.ts
```

