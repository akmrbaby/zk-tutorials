import zkeSDK from "@zk-email/sdk";
import fs from "fs/promises";

const blueprintSlug = "DimiDumo/SuccinctZKResidencyInvite@v3";

async function main() {
  const sdk = zkeSDK();

  // Blueprint（＝ゼロ知識証明の回路の定義）のインスタンスを取得
  const blueprint = await sdk.getBlueprint(blueprintSlug);
  const prover = blueprint.createProver({ isLocal: false }); // blueprint が prover？

  // サンプル用の eml を取得
  const eml = (await fs.readFile("./sample/residency.eml")).toString();

  // 証明を生成
  const proof = await prover.generateProof(eml);
  const { proofData, publicData } = proof.getProofData();
  console.log("proof: ", proofData);
  console.log("public: ", publicData);
}

main();
