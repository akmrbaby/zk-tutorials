import zkeSDK from "@zk-email/sdk";
import fs from "fs/promises";

async function main() {
  const sdk = zkeSDK();

  // Blueprint（＝ゼロ知識証明の回路の定義）のインスタンスを取得
  const blueprintSlug = "DimiDumo/SuccinctZKResidencyInvite@v3";
  const blueprint = await sdk.getBlueprint(blueprintSlug);
  const prover = blueprint.createProver();

  // サンプルメールを取得
  const eml = (await fs.readFile("./sample/residency.eml")).toString();

  // 証明を生成
  const proof = await prover.generateProof(eml);
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  console.log("proof: ", proofData);
  console.log("public: ", publicOutputs);

  // 保存
  await fs.writeFile("proofData.json", JSON.stringify(proofData));
  await fs.writeFile("publicOutputs.json", JSON.stringify(publicOutputs));
  console.log("Saved: proofData.json & publicOutputs.json");
}

main();
