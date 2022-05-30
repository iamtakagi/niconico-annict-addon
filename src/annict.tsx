import React, { useEffect, useState, useRef } from "react";
import { Root } from "react-dom/client";
import { generateGqlClient } from "./annict/annictAPI";
import {
  RATING_COLOR,
  RATING_LABEL,
  SEASON_LABEL,
  STATUS_LABEL,
} from "./annict/constants";
import {
  QueryWork,
  RatingState,
  StatusState,
  WorkFragment,
} from "./annict/gql";
import { Search } from "react-feather";
import { useDebounce } from "react-use";

export const SearchWorkForm: React.FC<{
  accessToken: string;
  setWorkId: React.Dispatch<React.SetStateAction<number | null>>;
}> = ({ accessToken, setWorkId }) => {
  const [localTerm, setLocalTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [works, setWorks] = useState<QueryWork[] | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!searchTerm || Array.from(searchTerm).length < 2) {
      setWorks(null);
      return;
    }
    const sdk = generateGqlClient(accessToken);
    let isSubscribed = true;
    sdk
      .searchWorksByTerm({
        term: searchTerm,
        count: null,
        since: null,
      })
      .then((result) => {
        if (isSubscribed) {
          setWorks((result.searchWorks?.nodes || []) as QueryWork[]);
          setIsVisible(true);
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [searchTerm]);
  useDebounce(
    () => {
      setSearchTerm(localTerm || null);
    },
    750,
    [localTerm]
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.composedPath().shift();
      if (!event || !ref.current || ref.current.contains(target as Node)) {
        return;
      }
      setIsVisible(false);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);

  return (
    <div ref={ref} style={{ background: "white", color: "black" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearchTerm(localTerm || null);
        }}
        style={{ display: "flex" }}
      >
        <input
          type="text"
          placeholder="キーワードを入力…"
          value={localTerm}
          onChange={(e) => setLocalTerm(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setSearchTerm(localTerm || null);
            }
          }}
          onFocus={() => setIsVisible(true)}
          onClick={() => setIsVisible(true)}
        />
        <button
          type="button"
          onClick={() => {
            setSearchTerm(localTerm || null);
          }}
        >
          <Search size={"16px"} />
        </button>
      </form>
      <div
        style={
          !isVisible || works === null
            ? { visibility: "hidden", display: "none", pointerEvents: "none" }
            : {
                visibility: "visible",
                position: "absolute",
                background: "white",
                color: "black",
                zIndex: 1,
              }
        }
      >
        {works !== null ? (
          0 < works.length ? (
            (works || []).map((work) => (
              <p
                key={work.id}
                onClick={() => setWorkId(work.annictId)}
                style={{ cursor: "pointer" }}
              >
                {work.title}
              </p>
            ))
          ) : (
            <div>
              <p>作品が見つかりません</p>
            </div>
          )
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

const AnnictRecorder: React.FC<{
  queryWork?: QueryWork;
  accessToken: string;
}> = ({ queryWork, accessToken }) => {
  const [timing, setTiming] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [work, setWork] = useState<WorkFragment | null>();
  const [workId, setWorkId] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<StatusState>(
    work?.viewerStatusState || StatusState.NO_STATE
  );
  const [episodeId, setEpisodeId] = useState<number | null>(null);

  // WorkFragment 初期取得
  useEffect(() => {
    setIsLoading(true);

    const sdk = generateGqlClient(accessToken);
    sdk
      .Work({ annictId: queryWork?.annictId! })
      .then((result) => {
        const work = result.searchWorks?.nodes?.[0];
        setWork(work || null);
        if (work) {
          setWorkId(work.annictId);
          setWatchStatus(work.viewerStatusState ?? StatusState.NO_STATE);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [accessToken, queryWork]);

  // Work 変更検知 挙動
  useEffect(() => {
    if (!workId) {
      setWork(null);
      return;
    }
    setIsLoading(true);
    const sdk = generateGqlClient(accessToken);
    sdk
      .Work({ annictId: workId })
      .then((result) => {
        const work = result.searchWorks?.nodes?.[0];
        setWork(work || null);
        if (work) {
          setWorkId(work.annictId);
          setWatchStatus(work.viewerStatusState ?? StatusState.NO_STATE);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [workId, timing]);

  // 視聴ステータスの挙動
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  useEffect(() => {
    if (!work || work.viewerStatusState === watchStatus) {
      return;
    }
    const sdk = generateGqlClient(accessToken);
    setIsStatusChanging(true);

    sdk
      .updateWorkStatus({
        workId: work.id,
        state: watchStatus,
      })
      .then(() => {
        setIsStatusChanging(false);
        setWork((prev) =>
          prev ? { ...prev, viewerStatusState: watchStatus } : null
        );
      })
      .catch(() => {
        setWatchStatus(work.viewerStatusState || StatusState.NO_STATE);
      });
  }, [watchStatus]);

  // 記録周り
  const [episode, setEpisode] = useState<{
    id: string;
    number?: number | null;
    numberText?: string | null;
    title?: string | null;
  } | null>(null);
  useEffect(() => {
    if (!episodeId || !work) {
      setEpisode(null);
      return;
    }
    const episode = work.episodes?.nodes?.find(
      (ep) => ep?.annictId === episodeId
    );
    setEpisode(episode || null);
  }, [episodeId, work]);

  const [rating, setRating] = useState<RatingState | null>(null);
  const [comment, setComment] = useState("");
  useEffect(() => {
    setRating(null);
    setComment("");
  }, [episode]);

  const [isTwitterEnabled, setIsTwitterEnabled] = useState<boolean>(false);
  const [isFacebookEnabled, setIsFacebookEnabled] = useState<boolean>(false);

  const [isRecording, setIsRecording] = useState(false);
  const ratingCount = Object.keys(RATING_LABEL).length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          document.querySelector(".FloatingPanelContainer")?.remove();
        }}
        style={{
          width: "16px",
          height: "16px",
          top: "0",
          right: "0",
          margin: "8px",
          position: "absolute",
        }}
        className="ActionButton CloseButton AnnictPanelContainer-headerButton"
      >
        <div className="CloseButton-inner">
          <svg
            viewBox="0 0 100 100"
            fillRule="evenodd"
            clipRule="evenodd"
            strokeLinejoin="round"
            strokeMiterlimit="1.4"
          >
            <path d="M50 32.8L81.6 1.2a4.1 4.1 0 015.8 0l11.4 11.4a4.1 4.1 0 010 5.9L67.2 50l31.6 31.6a4.1 4.1 0 010 5.8L87.4 98.8a4.1 4.1 0 01-5.9 0L50 67.2 18.4 98.8a4.1 4.1 0 01-5.8 0L1.2 87.4a4.1 4.1 0 010-5.9L32.8 50 1.2 18.4a4.1 4.1 0 010-5.8L12.6 1.2a4.1 4.1 0 015.9 0L50 32.8z"></path>
          </svg>
        </div>
      </button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <SearchWorkForm accessToken={accessToken} setWorkId={setWorkId} />
        <div style={{ marginTop: "1rem", position: "relative" }}>
          {work ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ paddingRight: ".25rem" }}>
                  <div style={{ fontSize: "14px" }}>視聴記録</div>
                  <a
                    style={{ fontSize: "12px" }}
                    href={`https://annict.com/works/${workId}`}
                    target="_blank"
                  >
                    {work.title}
                  </a>
                  <p style={{ fontSize: "12px" }}>{work.titleKana}</p>
                  {work.seasonName ? (
                    <div style={{ fontSize: "12px" }}>
                      <p style={{ color: "gray", marginRight: ".2rem" }}>
                        シーズン
                      </p>
                      <p>
                        {work.seasonYear}年{SEASON_LABEL[work.seasonName]}
                      </p>
                    </div>
                  ) : (
                    <></>
                  )}
                  {work.twitterHashtag ? (
                    <div style={{ fontSize: "12px" }}>
                      <p style={{ color: "gray", marginRight: ".2rem" }}>
                        ハッシュタグ
                      </p>
                      <a
                        style={{ display: "block" }}
                        href={`https://twitter.com/hashtag/${encodeURIComponent(
                          work.twitterHashtag
                        )}`}
                        target="_blank"
                      >
                        #{work.twitterHashtag}
                      </a>
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
                <img
                  src={work.image?.recommendedImageUrl ?? ""}
                  alt="work thumbnail"
                  style={{ width: "60%" }}
                />
              </div>

              <div>
                <select
                  onChange={(e) => {
                    setWatchStatus(e.target.value as never);
                  }}
                  value={watchStatus}
                  disabled={isStatusChanging}
                >
                  {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {episode ? (
                <div style={{ marginTop: "8px" }}>
                  <a
                    href={`https://annict.com/works/${workId}/episodes/${episodeId}`}
                    target="_blank"
                  >
                    {episode.numberText ?? episode.number} {episode.title}
                  </a>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!episodeId) {
                        return;
                      }
                      setIsRecording(true);
                      const sdk = generateGqlClient(accessToken);
                      sdk
                        .createRecord({
                          episodeId: episode.id,
                          comment: comment || null,
                          ratingState: rating,
                          shareTwitter: isTwitterEnabled,
                          shareFacebook: isFacebookEnabled,
                        })
                        .then(() => {
                          setTiming(performance.now());
                          setEpisodeId(null);
                        })
                        .finally(() => setIsRecording(false));
                    }}
                  >
                    <div>
                      {Object.entries(RATING_LABEL).map(([key, label], idx) => (
                        <button
                          type="button"
                          style={
                            rating === key
                              ? { background: RATING_COLOR[key], borderRadius: "0.375rem" }
                              : {}
                          }
                          onClick={() => {
                            const _key = key as RatingState;
                            setRating((prev) => (prev === _key ? null : _key));
                          }}
                          key={key}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="感想を入力（省略可能）"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    ></textarea>
                    <div>
                      <label>
                        <input
                          type="checkbox"
                          checked={isTwitterEnabled}
                          onChange={() =>
                            setIsTwitterEnabled((enabled) => !enabled)
                          }
                        />
                        <span style={{marginLeft: "2px"}}>Twitter</span>
                      </label>
                      <label style={{marginLeft: "3px"}}>
                        <input
                          type="checkbox"
                          checked={isFacebookEnabled}
                          onChange={() =>
                            setIsFacebookEnabled((enabled) => !enabled)
                          }
                        />
                        <span style={{marginLeft: "2px"}}>Facebook</span>
                      </label>
                    </div>
                    <div>
                      <button type="submit" disabled={isRecording}>
                        記録する
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <></>
              )}
              <div
                style={{
                  overflow: "auto",
                  marginTop: "8px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  fontSize: "12px",
                  maxHeight: "300px",
                }}
              >
                {work.episodes?.nodes?.map((episode) => (
                  <p
                    onClick={() => {
                      setEpisodeId((prev) =>
                        prev === episode?.annictId
                          ? null
                          : episode?.annictId || null
                      );
                    }}
                    key={episode?.annictId}
                    style={{
                      color: episode?.viewerDidTrack ? "gray" : "black",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {episode?.numberText || episode?.number} {episode?.title}
                    </span>
                    <span
                      style={{ marginLeft: ".2rem" }}
                    >{`(記録数: ${episode?.viewerRecordsCount})`}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div>{isLoading ? "読込中…" : "作品が見つかりませんでした"}</div>
          )}
        </div>
      </div>
    </>
  );
};

export const renderAnnict = (
  root: Root,
  queryWork: QueryWork,
  accessToken: string
) =>
  root.render(
    <React.StrictMode>
      <AnnictRecorder queryWork={queryWork} accessToken={accessToken} />
    </React.StrictMode>
  );
