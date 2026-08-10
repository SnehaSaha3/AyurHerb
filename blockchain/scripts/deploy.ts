import hre from "hardhat";

async function main() {
  const CropRegistry = await hre.ethers.getContractFactory("CropRegistry");
  const cropRegistry = await CropRegistry.deploy();
  await cropRegistry.waitForDeployment();
  console.log("CropRegistry deployed to:", (cropRegistry as any).target);

  const OrderLog = await hre.ethers.getContractFactory("OrderLog");
  const orderLog = await OrderLog.deploy();
  await orderLog.waitForDeployment();
  console.log("OrderLog deployed to:", (orderLog as any).target);

}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});