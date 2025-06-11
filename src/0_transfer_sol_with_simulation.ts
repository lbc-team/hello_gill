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

// 💰 设置优先费参数
const priorityFeeRate = 50_000; // 50,000 micro-lamports = 0.05 lamports per compute unit
const computeUnitLimit = 200_000; // 设置计算单位限制

console.log("⚡ 优先费设置:");
console.log("===============");
console.log("🚀 优先费率:", priorityFeeRate, "micro-lamports/compute unit");
console.log("📊 计算单位限制:", computeUnitLimit);
console.log("💰 最大优先费:", (priorityFeeRate * computeUnitLimit / 1_000_000).toFixed(6), "SOL");

// 创建交易（包含优先费设置）
const tx = createTransaction({
  version: "legacy",
  feePayer: signer,
  instructions: [transferSolIx],
  latestBlockhash,
  // 🔥 添加优先费设置
  computeUnitLimit: computeUnitLimit,      // 设置计算单位限制
  computeUnitPrice: priorityFeeRate,       // 设置优先费率（micro-lamports per compute unit）
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
  
  // 计算交易费用详情
  const actualUnitsConsumed = Number(simulation.value.unitsConsumed || 5000);
  const baseFee = 5000; // 基础交易费用 (lamports)
  const priorityFee = (actualUnitsConsumed * priorityFeeRate) / 1_000_000; // 优先费 (lamports)
  const totalFee = baseFee + priorityFee; // 总费用 (lamports)
  
  console.log("💰 交易费用明细:");
  console.log("================");
  console.log("📍 基础交易费:", (baseFee / 1_000_000_000).toFixed(9), "SOL");
  console.log("🚀 优先费:", (priorityFee / 1_000_000_000).toFixed(9), "SOL");
  console.log("💵 总交易费:", (totalFee / 1_000_000_000).toFixed(9), "SOL");
  console.log("💎 转账金额:", transferAmount / 1_000_000_000, "SOL");
  
  // 优先费效果说明
  console.log("\n🎯 优先费说明:");
  console.log("==============");
  if (priorityFee > 0) {
    console.log("✅ 已设置优先费，交易将获得更高处理优先级");
    console.log("⚡ 在网络拥堵时，优先费可大幅提升交易成功率");
    console.log("💡 优先费 = 实际消耗计算单位 × 费率");
    console.log(`📊 ${actualUnitsConsumed} units × ${priorityFeeRate} micro-lamports = ${priorityFee.toFixed(0)} lamports`);
  } else {
    console.log("⚠️  未设置优先费，可能在网络拥堵时处理较慢");
  }

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
 * 🚀 优先费设置最佳实践
 * ====================
 * 
 * 💰 优先费计算公式：
 *    优先费 = 计算单位消耗 × 优先费率（micro-lamports/unit）
 * 
 * 📊 常用优先费率推荐：
 *    • 低优先级: 1,000 - 10,000 micro-lamports
 *    • 中优先级: 10,000 - 50,000 micro-lamports  
 *    • 高优先级: 50,000 - 100,000 micro-lamports
 *    • 紧急处理: 100,000+ micro-lamports
 * 
 * ⚡ 优先费设置技巧：
 *    • 网络空闲时可设置较低费率或不设置
 *    • 网络拥堵时建议设置较高费率
 *    • 时间敏感交易应设置高优先费
 *    • 可通过模拟预估实际计算单位消耗
 * 
 * 🎯 计算单位限制建议：
 *    • 简单转账: 200,000 units
 *    • Token操作: 300,000 - 500,000 units
 *    • 复杂DeFi交易: 800,000 - 1,400,000 units
 *    • 设置过低会导致交易失败
 *    • 设置过高只是浪费（不会额外收费）
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
 * ExceededMaxComputeUnits → 增加计算单位限制
 */ 