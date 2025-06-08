
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

transfer_sol.ts：Sol 转账交易
### create_token.ts

创建 Token （Mint）， 默认是没有 Meta 信息的, 例如：[这个Token](https://explorer.solana.com/address/4fzXpMnMK3xc6wGf9xuLg56gVCqKXeQybEJ4x3jEXc9X?cluster=devnet) , Mint 账户记录着这些信息：
decimals : 小数位数 
supply： 当前总供应量
mint_authority: 铸造权限， 谁可以发行 token 
freeze_authority: 冻结权限：冻结或解冻某个账户的 Token， 防止该账户进行转账或接收 Token。

结构定义参考：
https://github.com/solana-program/token/blob/main/program/src/state.rs

Mint 账户代表着 token 的“身份”， SPL Token 相关程序（比如钱包、DEX、DeFi）都以 mint 为判断 token 类型的依据。






## 运行

```
pnpx esrun ./src/transfer_sol.ts
```

