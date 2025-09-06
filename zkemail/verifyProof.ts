import zkeSDK from "@zk-email/sdk";
import fs from "fs/promises";

async function main() {
  const sdk = zkeSDK();

  // Blueprint（＝ゼロ知識証明の回路の定義）のインスタンスを取得
  const blueprintSlug = "DimiDumo/SuccinctZKResidencyInvite@v3";
  const blueprint = await sdk.getBlueprint(blueprintSlug);

  // 検証に必要な情報の読み出し（通常は証明者が検証者に提示する）
  const proofDataJSON = await fs.readFile("./proofData.json", "utf-8");
  const publicOutputsJSON = await fs.readFile("./publicOutputs.json", "utf-8");

  // SDK に渡して検証
  const isValid = await blueprint.verifyProofData(
    publicOutputsJSON,
    proofDataJSON
  );
  console.log("isValid:", isValid);
}

main();
