import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Comlink from "comlink";
import {
  Prover as TProver,
  Presentation as TPresentation,
  Commit,
  NotaryServer,
  Transcript,
  mapStringToRange,
  subtractRanges,
} from "tlsn-js";
import { PresentationJSON } from "tlsn-js/build/types";
import { HTTPParser } from "http-parser-js";

// workerの設定
const { init, Prover, Presentation }: any = Comlink.wrap(
  new Worker(new URL("./worker.ts", import.meta.url))
);

// Notaryサーバーと対象サーバーの設定
const notaryUrl = "https://notary.pse.dev/v0.1.0-alpha.12";
const websocketProxyUrl =
  "wss://notary.pse.dev/proxy?token=raw.githubusercontent.com";
const serverUrl =
  "https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.12/crates/server-fixture/server/src/data/1kb.json";
const serverDns = "raw.githubusercontent.com";

function App() {
  const [initialized, setInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [presentationJSON, setPresentationJSON] =
    useState<PresentationJSON | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      await init();
      setInitialized(true);
    })();
  }, []);

  const onClick = useCallback(async () => {
    setProcessing(true);
    const notary = NotaryServer.from(notaryUrl);

    // Prover によるリクエスト送信: ProverがNotaryサーバーと通信してセッションを確立し、リクエスト対象サーバーにGETリクエストを送信
    const prover = (await new Prover({
      serverDns: serverDns,
      maxRecvData: 2048,
    })) as TProver;
    await prover.setup(await notary.sessionUrl());
    await prover.sendRequest(websocketProxyUrl, {
      url: serverUrl,
      method: "GET",
      headers: { "Content-Type": "application/json", secret: "test_secret" },
    });

    // Transcript(通信ログ)とCommit（証明対象）の作成
    const { sent, recv } = await prover.transcript();
    const {
      info: recvInfo,
      headers: recvHeaders,
      body: recvBody,
    } = parseHttpMessage(Buffer.from(recv), "response");
    const body = JSON.parse(recvBody[0].toString());

    const commit: Commit = {
      sent: subtractRanges(
        { start: 0, end: sent.length },
        mapStringToRange(
          ["secret: test_secret"],
          Buffer.from(sent).toString("utf-8")
        )
      ),
      recv: [
        ...mapStringToRange(
          [
            recvInfo,
            `${recvHeaders[4]}: ${recvHeaders[5]}\r\n`,
            `${recvHeaders[6]}: ${recvHeaders[7]}\r\n`,
            `${recvHeaders[8]}: ${recvHeaders[9]}\r\n`,
            `${recvHeaders[10]}: ${recvHeaders[11]}\r\n`,
            `${recvHeaders[12]}: ${recvHeaders[13]}`,
            `${recvHeaders[14]}: ${recvHeaders[15]}`,
            `${recvHeaders[16]}: ${recvHeaders[17]}`,
            `${recvHeaders[18]}: ${recvHeaders[19]}`,
            `"name": "${body.information.name}"`,
            `"street": "${body.information.address.street}"`,
          ],
          Buffer.from(recv).toString("utf-8")
        ),
      ],
    };

    // Notarization (公証): Notaryサーバーから証明書をもらう
    const notarizationOutputs = await prover.notarize(commit);
    const presentation = (await new Presentation({
      attestationHex: notarizationOutputs.attestation,
      secretsHex: notarizationOutputs.secrets,
      notaryUrl: notarizationOutputs.notaryUrl,
      websocketProxyUrl: notarizationOutputs.websocketProxyUrl,
      reveal: { ...commit, server_identity: false },
    })) as TPresentation;

    setPresentationJSON(await presentation.json());
  }, []);

  useEffect(() => {
    (async () => {
      if (!presentationJSON) return;

      // Verification (検証): Notary の公開鍵や通信ログから、改ざんされていないことを確認する
      const proof = (await new Presentation(
        presentationJSON.data
      )) as TPresentation;
      const notary = NotaryServer.from(notaryUrl);
      const notaryKey = await notary.publicKey("hex");
      const verifierOutput = await proof.verify();
      const transcript = new Transcript({
        sent: verifierOutput.transcript?.sent || [],
        recv: verifierOutput.transcript?.recv || [],
      });
      const vk = await proof.verifyingKey();
      setResult({
        time: verifierOutput.connection_info.time,
        verifyingKey: Buffer.from(vk.data).toString("hex"),
        notaryKey: notaryKey,
        serverName: verifierOutput.server_name,
        sent: transcript.sent(),
        recv: transcript.recv(),
      });
      setProcessing(false);
    })();
  }, [presentationJSON]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h1>TLSNotary Demo</h1>
      <div>Server: {serverUrl}</div>
      <div>Notary Server: {notaryUrl}</div>
      <div>WebSocket Proxy: {websocketProxyUrl}</div>

      <button
        onClick={!processing ? onClick : undefined}
        disabled={processing || !initialized}
      >
        {processing ? "Working…" : "Start Demo"}
      </button>

      <section>
        <b>Proof:</b>
        {!processing && !presentationJSON ? (
          <i> not started</i>
        ) : !presentationJSON ? (
          <span> Proving data from {serverDns}…</span>
        ) : (
          <pre data-testid="proof-data">
            {JSON.stringify(presentationJSON, null, 2)}
          </pre>
        )}
      </section>

      <section>
        <b>Verification:</b>
        {!presentationJSON ? (
          <i> not started</i>
        ) : !result ? (
          <i> verifying</i>
        ) : (
          <pre data-testid="verify-data">{JSON.stringify(result, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}

function parseHttpMessage(buffer: Buffer, type: "request" | "response") {
  const parser = new HTTPParser(
    type === "request" ? HTTPParser.REQUEST : HTTPParser.RESPONSE
  );
  const body: Buffer[] = [];
  let complete = false;
  let headers: string[] = [];
  parser.onBody = (t) => {
    body.push(t);
  };
  parser.onHeadersComplete = (res) => {
    headers = res.headers;
  };
  parser.onMessageComplete = () => {
    complete = true;
  };
  parser.execute(buffer);
  parser.finish();
  if (!complete) throw new Error(`Could not parse ${type.toUpperCase()}`);
  return {
    info: buffer.toString("utf-8").split("\r\n")[0] + "\r\n",
    headers,
    body,
  };
}

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);

export default App;
