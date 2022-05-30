import { renderAnnict } from "./annict";
import { createRoot } from "react-dom/client";
import { generateGqlClient } from "./annict/annictAPI";
import { QueryWork } from "./annict/gql";
import appVersion from "./manifest/version";

window.onload = async () => {
  if (!window.location.href.startsWith("https://www.nicovideo.jp/watch/"))
    return console.log("[niconico-annict-addon] Skipped");

  console.log(`[niconico-annict-addon] Loaded: v${appVersion}`);

  const body = document.body || document.getElementsByTagName("body")[0];

  if (body !== null) {
    const tabContainer = body.querySelector<HTMLDivElement>(".col-1of12");

    if (tabContainer !== null) {
      const accessToken = (await browser.storage.sync.get("accessToken"))["accessToken"]

      tabContainer.style.paddingLeft = "0"; //既存のスタイルが崩れるので左の padding を削除

      // Annict Button の追加
      const annictBtn = document.createElement("button");
      annictBtn.type = "button";
      annictBtn.className =
        "ActionButton AnnictButton VideoMenuContainer-button";
      annictBtn.style.paddingLeft = "0";
      annictBtn.style.paddingTop = "6px";
      annictBtn.style.paddingRight = "6px";
      annictBtn.style.paddingBottom = "6px";
      annictBtn.style.maxWidth = "28px";
      annictBtn.style.maxHeight = "28px";

      const annictLogo = document.createElement("img");
      annictLogo.src = browser.runtime.getURL("annict-logo-ver3.png");
      annictLogo.style.width = "28px";
      annictLogo.style.height = "28px";
      annictLogo.style.verticalAlign = "middle";
      annictLogo.style.lineHeight = "20px";
      annictBtn.appendChild(annictLogo);

      // Annict Button をクリックしたときの挙動
      annictBtn.addEventListener("click", async () => {
        // 作品名を取得
        const titleElm = body.querySelector<HTMLDivElement>(
          ".SeriesBreadcrumbs-title"
        );
        if (titleElm !== null) {
          const title = titleElm.innerText;

          const container = body.querySelector(".MainContainer-floatingPanel");

          if (container !== null) {
            // Container 中身をクリーンアップ
            Array.from(container.children).forEach((e) => {
              e.remove();
            });

            const wrapper = document.createElement("div");
            wrapper.className = "FloatingPanelContainer is-visible";
            container.appendChild(wrapper);

            // Recorder のコンテナ要素を追加
            const recorderRoot = document.createElement("div");
            recorderRoot.className = "AnnictPanelContainer";
            recorderRoot.style.padding = "8px";
            recorderRoot.style.position = "relative";

            wrapper.appendChild(recorderRoot);

            if (accessToken && typeof accessToken === "string") {
              // 記録用コンポーネント描画前に作品データを取得します。要素から取得した作品名によっては、空白や括弧の関係で取得できない場合があります。
              const sdk = generateGqlClient(accessToken);

              sdk
                .searchWorksByTerm({
                  term: title,
                  count: null,
                  since: null,
                })
                .then(async (result) => {
                  const queryWork = result.searchWorks?.nodes?.find(
                    (work) => work?.title === title
                  ) as QueryWork;
                  const reactRoot = createRoot(recorderRoot);

                  // ReactDOM から描画
                  renderAnnict(reactRoot, queryWork, accessToken);
                })
                .catch((e: Error) => {
                  recorderRoot.innerText = e.message;
                });
            } else {
              recorderRoot.innerText = "アクセストークンが未設定です。\nアドオンの設定からアクセストークンを設定してください。";
            }
          }
        }
      });

      tabContainer.prepend(annictBtn); // 先頭に追加
    }
  }
};
