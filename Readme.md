
参考视频：https://learnblockchain.cn/video/play/1248

## 工程初始化

```
mkdir hello_gill
cd hello_gill

nvm use 22

# 初始化 Node.js 工程，创建一个 package.json 文件
pnpm init

# 在当前目录下初始化一个 TypeScript 项目，生成一个 tsconfig.json 文件
tsc --init 

# https://github.com/solana-foundation/gill
pnpm add gill esrun dotenv 

pnpm add @types/node typescript


```

## 运行


pnpx esrun ./src/transfer_sol.ts


