# ZK Email メモ

## 概要

- ZK Email は、特定のデータを選択的に開示しながら電子メールを匿名で検証するためのライブラリ。
- 証明者は特定の送信者またはドメインからのメール受信、あるいは件名や本文内の特定テキストの存在を証明できる。
- Web 2.0 の相互運用性、スマートアカウントのメール復旧ソリューション、匿名 KYC、あるいは匿名集合に基づくアプリケーションの作成に活用可能。

## ざっくりとしたイメージ

既存のメールインフラ（SMTP, DKIM, etc.）をそのまま利用しつつ、

- このメールを確かに受け取ったこと
- メールに含まれる特定の情報だけ（ドメイン・クーポンコード・所属先など）を開示できること

をゼロ知識証明で保証する仕組み。

## 仕組み

ZK Email は、ゼロ知識証明を使ってメールを検証できる強力な仕組みで、DKIM（DomainKeys Identified Mail）プロトコルに基づいている。動作の流れは次の通り。

1. メールがドメインから送信されるとき、そのドメインの秘密鍵で署名される
2. 対応する公開鍵は、そのドメインの DNS レコードに公開されている
3. 受信者は DKIM 署名を検証することで、メールの正当性を確認する
4. ZK Email はさらに、メールの内容を明かさずに、その検証が正しく行われたことを証明できる（プライバシーを保持）

もっと詳しい仕組みは[こちら](https://docs.zk.email/architecture)

## ZK Email SDK (Blueprint SDK?)

まずは、ZK Email SDK を使ってみる。

ZK Email SDK: https://docs.zk.email/zk-email-sdk

### 概要

- Blueprint SDK は TypeScript ライブラリで、ZK Email 検証をアプリケーションに統合できる。
- 暗号的な複雑さはすべて SDK が処理する。
- 開発者は 正規表現 (regex) パターン を使って、抽出したいメールフィールド（送信者、件名、本文など）を指定するだけで済む。これらのパターン定義は Registry に送信されます。
- Registry は、ZK 回路のコンパイルと検証コントラクトのデプロイを担当する。

### 3 つのコア機能

- Create Blueprint
  - 正規表現パターンを用いて、メールから抽出するフィールドを定義し、さらに公開／非公開データの可視性などの証明パラメータを指定することで、メール検証テンプレートを作成する。
- Generate Proof
  - Blueprint の仕様に基づき、メールからゼロ知識証明を生成する。これにより、メールの真正性や内容に関する主張を、実際のメールを公開することなく証明できる。
- Verify Proof
  - 証明をオフチェーンで検証したり、スマートコントラクトを通じてオンチェーンで検証することができる。これにより、dApps はトラストレスにメールに基づく主張を確認できる。

### 手順

前提：npm が入っている。

1. zk email の sdk をインストール

   ```bash
   $ npm install @zk-email/sdk@0.0.133
   ```

2. `./sample/residency.eml` を保存

   公式が提供しているサンプルメール（`residency.eml`）は[こちら](https://docs.zk.email/files/residency.eml)からダウンロード可能

3. `./generateProof.ts` を作成

   ```ts
   // ./generateProof.ts
   import zkeSDK from "@zk-email/sdk";
   import fs from "fs/promises";

   // スラグを指定？
   const blueprintSlug = "DimiDumo/SuccinctZKResidencyInvite@v3";

   async function main() {
     // SDK 初期化
     const sdk = zkeSDK();
     const blueprint = await sdk.getBlueprint(blueprintSlug);
     const prover = blueprint.createProver();

     // サンプル用の eml を取得
     const eml = (await fs.readFile("./sample/residency.eml")).toString();

     // 証明を生成
     const proof = await prover.generateProof(eml);
     const { proofData, publicData } = proof.getProofData();
     console.log("proof: ", proofData);
     console.log("public: ", publicData);
   }

   main();
   ```

4. `generateProof.ts` を実行

   ```bash
   $ npx tsx ./generateProof.ts
   ```

   以下のような出力が出れば OK。

   ```bash
   generating remote proof
   generating proof inputs
   getting blueprint by id
   proof:  {
    pi_a: [
      '3823895070259892820229909391629845405773030161493420031019622206689183764981',
      '15874545966293212099658455972769003470426350945842195399444383747958917418983',
      '1'
    ],
    pi_b: [
      [
        '6411320377038977934326648113906309956323898988587337804655737556207022329123',
        '5791673204643235339014670376692315215752959624079727063739326045592880243114'
      ],
      [
        '5415868431018423496559861854784290712887783675411758605995925555680049344730',
        '20800048080841477270421785110070241790438667402131402934722501216402959126727'
      ],
      [ '1', '0' ]
    ],
    pi_c: [
      '2063545215112768145495436553011152049897186956926915662059607400271284109813',
      '13813785023324930721526885767673182950994434440265551561953208559216457405898',
      '1'
    ],
    protocol: 'groth16'
   }
   public:  { subject: [ 'Welcome ', 'to the Succinct ZK Residency!' ] }
   ```

デモコードは[こちら](https://github.com/zkemail/sdk-ts-demo/tree/main/node_js)を参照。

### Registry

ZK Email Registry は、メールのゼロ知識証明を作成・管理・共有できるプラットフォーム。メール検証の Blueprint（設計図） を定義し、証明を生成するためのインターフェースを提供する。

既存の Blueprint を閲覧して他の人が作ったものを確認したり、自分で新しい Blueprint を作成することもできる。

Registry は[こちら](https://registry.zk.email/)

### Blueprint とは？

Blueprint とは、メール証明を定義するためのパラメータの集合。

- メールの一部を抽出するための 正規表現 (regex)
- メールヘッダーや本文のサイズ
- 送信者アドレス
- その他必要なフィールド

Registry はこれらのパラメータを使って ZK 回路をコンパイルし、証明を生成する仕組みと、証明を検証するスマートコントラクトを作成する。

Blueprint の構成要素

- Pattern Details（パターンの詳細）
  - パターン名、回路名、Blueprint の説明を定義する。
- Proof Details（証明の詳細）
  - 送信者、抽出するフィールド、証明生成のための外部入力を含む。

## 参考

公式サイト: https://zk.email/
