import 'dotenv/config';
import {
    getExplorerLink,
    createTransaction,
    createSolanaClient,
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    address,
  } from "gill";
  import { getBase64EncodedWireTransaction } from "@solana/kit";
  import { loadKeypairSignerFromFile } from "gill/node";
  import { getTransferSolInstruction } from "gill/programs";

/**
 * 使用 @solana/kit 进行模拟交易的完整示例
 * 
 * 这个文件展示了如何使用 @solana/kit 的 simulateTransaction 方法
 * 来在发送真实交易前验证交易的可行性
 */

const signer = await loadKeypairSignerFromFile();
console.log("🔐 钱包地址:", signer.address);

const cluster = process.env.DEVNET_RPC || "devnet";
console.log("🌐 连接网络:", cluster);

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: cluster,
});

// 查询发送方账户余额
const { value: senderBalance } = await rpc.getBalance(signer.address).send();
console.log("💰 发送方账户余额（SOL）:", Number(senderBalance) / 1_000_000_000);

const receiver = address("8gwAbvN8t7n7PoTqWhuqPJ7s4Vgov1YNPByMBJavgHJt");

// 查询接收方账户余额
const { value: receiverBalanceBefore } = await rpc.getBalance(receiver).send();
console.log("💰 接收方账户余额（转账前）（SOL）:", Number(receiverBalanceBefore) / 1_000_000_000);

// 创建转账指令 - 转账 0.001 SOL
const transferAmount = 1_000_000; // 1,000,000 lamports = 0.001 SOL
const transferSolIx = getTransferSolInstruction({
  amount: transferAmount,
  destination: receiver,
  source: signer,
});

// 获取最新的区块哈希
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
console.log("⏰ 获取最新区块哈希:", latestBlockhash.blockhash);

// 创建交易
const tx = createTransaction({
  version: "legacy",
  feePayer: signer,
  instructions: [transferSolIx],
  latestBlockhash,
});

// 签名交易
const signedTransaction = await signTransactionMessageWithSigners(tx);

/**
 * 🎯 使用 @solana/kit 进行模拟交易
 */
console.log("\n🎯 开始模拟交易执行...");
console.log("===============================");

try {
  // 使用 simulateTransaction 进行模拟
  // 需要将交易序列化为Base64格式
  const serializedTransaction = getBase64EncodedWireTransaction(signedTransaction);
  
  const simulation = await rpc.simulateTransaction(serializedTransaction, {
    encoding: 'base64',       // 必需的编码参数
    sigVerify: false,         // 跳过签名验证以提高性能
    commitment: 'processed',  // 使用最新状态
    replaceRecentBlockhash: false, // 不替换区块哈希
  }).send();

  console.log("📊 模拟交易结果:");
  console.log("===============");
  
  if (simulation.value.err) {
    console.error("❌ 模拟交易失败!");
    console.error("🚨 错误信息:", simulation.value.err);
    console.log("📋 执行日志:", simulation.value.logs);
    
    // 根据错误类型提供建议
    if (simulation.value.err.toString().includes("insufficient funds")) {
      console.log("💡 建议: 账户余额不足，请充值后重试");
    } else if (simulation.value.err.toString().includes("InvalidAccountData")) {
      console.log("💡 建议: 账户数据无效，请检查账户地址");
    }
    
    process.exit(1);
  }

  // 模拟成功 - 显示详细信息
  console.log("✅ 模拟交易成功!");
  console.log("⚡ 消耗计算单位:", simulation.value.unitsConsumed || "未知");
  
  // 修复数值计算类型问题
  const unitsConsumed = Number(simulation.value.unitsConsumed || 5000);
  console.log("💰 预估交易费用:", (unitsConsumed * 0.000001).toFixed(9), "SOL");
  console.log("💵 转账金额:", transferAmount / 1_000_000_000, "SOL");
  
  // 显示执行日志
  if (simulation.value.logs && simulation.value.logs.length > 0) {
    console.log("📋 执行日志:");
    simulation.value.logs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`);
    });
  }

  // 显示返回数据（如果有）
  if (simulation.value.returnData) {
    console.log("📄 返回数据:", simulation.value.returnData);
  }

  // 显示账户变化（如果有）
  if (simulation.value.accounts) {
    console.log("🔄 账户状态变化:", simulation.value.accounts);
  }

} catch (error) {
  console.error("❌ 模拟交易时发生异常:", error);
  process.exit(1);
}

console.log("\n🚀 模拟成功，准备发送真实交易...");
console.log("=====================================");

// 显示交易链接
const signature = getSignatureFromTransaction(signedTransaction);
console.log("🔗 Solana Explorer 链接:");
console.log(getExplorerLink({
  cluster: "devnet",
  transaction: signature,
}));

// 询问用户是否继续（在实际应用中）
console.log("⏳ 准备发送交易，请稍候...");

try {
  // 发送并确认交易
  await sendAndConfirmTransaction(signedTransaction);
  
  console.log("✅ 交易确认成功!");
  console.log("📄 交易签名:", signature);
  
  // 再次查询双方余额验证交易结果
  const { value: senderBalanceAfter } = await rpc.getBalance(signer.address).send();
  const { value: receiverBalanceAfter } = await rpc.getBalance(receiver).send();
  
  console.log("\n💰 交易后余额:");
  console.log("================");
  console.log("发送方余额:", Number(senderBalanceAfter) / 1_000_000_000, "SOL");
  console.log("接收方余额:", Number(receiverBalanceAfter) / 1_000_000_000, "SOL");
  
  // 计算实际变化
  const senderChange = (Number(senderBalanceAfter) - Number(senderBalance)) / 1_000_000_000;
  const receiverChange = (Number(receiverBalanceAfter) - Number(receiverBalanceBefore)) / 1_000_000_000;
  
  console.log("\n📈 余额变化:");
  console.log("============");
  console.log("发送方变化:", senderChange.toFixed(9), "SOL");
  console.log("接收方变化:", receiverChange.toFixed(9), "SOL");
  
} catch (error) {
  console.error("❌ 交易发送失败:", error);
  console.log("💡 提示: 虽然模拟成功，但实际发送可能因网络状况等原因失败");
}

/**
 * 📚 模拟交易的最佳实践总结
 * ================================
 * 
 * ✅ 总是在发送真实交易前进行模拟
 * ✅ 检查模拟结果中的错误信息和日志
 * ✅ 使用计算单位消耗来预估费用
 * ✅ 根据模拟结果调整交易参数
 * ✅ 处理模拟成功但实际失败的情况
 * ✅ 为用户提供清晰的反馈信息
 * 
 * 📋 常见模拟错误及解决方案
 * ========================
 * 
 * InsufficientFundsForRent → 增加账户余额
 * InsufficientFundsForFee → 确保有足够SOL支付费用  
 * InvalidAccountData → 检查账户地址和数据
 * InvalidInstruction → 验证指令参数
 * MissingRequiredSignature → 确保所有必需签名
 * AccountAlreadyInUse → 等待账户释放或使用其他账户
 */ 