
参考视频：https://learnblockchain.cn/video/play/1248

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

## 运行

```
pnpx esrun ./src/transfer_sol.ts
```

