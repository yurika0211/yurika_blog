import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Github,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useHandscroll } from "../hooks/useHandscroll";
import { formatDate } from "../utils/date";
import "../styles/handscroll.css";

export type ReadingWallPostCard = {
  id: string;
  title: string;
  summary: string;
  date: string;
  category?: string;
  tags: string[];
  is_pinned?: boolean;
  cover: string | null;
  coverBg: string;
};

export type ReadingWallRepoCard = {
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
};

const CHAPTERS = ["引首", "文录", "造物", "余白"];

function IndexState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty: string;
}) {
  return (
    <div className="handscroll-state" role="status">
      {loading ? (
        <>
          <span className="handscroll-state__ink" aria-hidden="true" />
          <p>墨迹将至，请稍候。</p>
        </>
      ) : (
        <>
          <span className="handscroll-state__mark" aria-hidden="true">
            {error ? "候" : "白"}
          </span>
          <p>{error ? "暂时未能取回内容。" : empty}</p>
          <p className="handscroll-state__note">
            {error
              ? "稍后再来，或由下方入口继续阅读。"
              : "留一些空白，等下一次落笔。"}
          </p>
        </>
      )}
    </div>
  );
}

function ChapterTitle({
  number,
  title,
  note,
}: {
  number: string;
  title: string;
  note: string;
}) {
  return (
    <div className="handscroll-chapter-title" data-drag-surface>
      <span className="handscroll-kicker">{number}</span>
      <h2>{title}</h2>
      <p>{note}</p>
    </div>
  );
}

export default function HeroReadingWall({
  featuredPosts,
  recentPosts,
  projects,
  latestPostDate,
  postsLoading,
  postsError,
  reposLoading,
  reposError,
}: {
  featuredPosts: ReadingWallPostCard[];
  recentPosts: ReadingWallPostCard[];
  projects: ReadingWallRepoCard[];
  latestPostDate: string;
  postsLoading: boolean;
  postsError: string | null;
  reposLoading: boolean;
  reposError: string | null;
}) {
  const { railRef, stageRef, progressRef, chapter, goTo } = useHandscroll();
  const posts = [
    ...new Map(
      [...featuredPosts, ...recentPosts].map((post) => [post.id, post]),
    ).values(),
  ].slice(0, 3);

  return (
    <section
      ref={stageRef}
      className="scroll-stage handscroll"
      aria-label="山水之间，一卷日常"
    >
      <div className="handscroll-edition" aria-hidden="true">
        <span>山水之间 · 一卷日常</span>
        <span>YURIKA’S JOURNAL</span>
      </div>
      <div
        ref={railRef}
        className="scroll-rail handscroll-rail"
        tabIndex={0}
        role="region"
        aria-label="横向手卷，可滚动、左右滑动或使用方向键翻阅"
        aria-describedby="handscroll-hint"
      >
        <div className="scroll-mount handscroll-mount">
          <div className="scroll-rod scroll-rod--head" aria-hidden="true" />
          <section
            className="handscroll-panel handscroll-cover"
            data-chapter
            data-drag-surface
            aria-labelledby="handscroll-title"
          >
            <img
              className="handscroll-cover__art"
              src="/scroll-landscape.webp"
              alt=""
              width="1536"
              height="1024"
              fetchPriority="high"
              draggable={false}
            />
            <div className="handscroll-cover__writing">
              <span className="handscroll-cover__eyebrow">ユリカの手帖</span>
              <h1 id="handscroll-title">水仙女</h1>
              <div className="handscroll-cover__verse">
                <p>凌波照影，</p>
                <p>素袖生香。</p>
                <span
                  className="scroll-seal scroll-seal--solid"
                  aria-hidden="true"
                >
                  水僊
                </span>
              </div>
            </div>
            <div className="handscroll-cover__invitation">
              <p>把寻常日子，慢慢写成一卷。</p>
              <button className="handscroll-text-link" onClick={() => goTo(1)}>
                展卷 · 读近作 <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
            <span className="handscroll-cover__caption" aria-hidden="true">
              清风徐来 · 此间有字
            </span>
          </section>
          <section
            className="handscroll-panel handscroll-collection"
            data-chapter
            aria-label="文录"
          >
            <ChapterTitle
              number="壹 / JOURNAL"
              title="文录"
              note="写过的字，走过的路。"
            />
            <div className="handscroll-collection__body">
              <div className="handscroll-list" aria-busy={postsLoading}>
                {!postsLoading && !postsError && posts.length ? (
                  posts.map((post, index) => (
                    <Link
                      key={post.id}
                      to={`/post/${post.id}`}
                      className="handscroll-entry"
                    >
                      <span className="handscroll-entry__number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="handscroll-entry__copy">
                        <p className="handscroll-entry__meta">
                          <span>{formatDate(post.date)}</span>
                          {post.is_pinned ? (
                            <span className="handscroll-entry__pinned">
                              精选
                            </span>
                          ) : post.category ? (
                            <span>{post.category}</span>
                          ) : null}
                        </p>
                        <h3>{post.title}</h3>
                        {post.summary && (
                          <p className="handscroll-entry__summary">
                            {post.summary}
                          </p>
                        )}
                      </div>
                      {post.cover && (
                        <img
                          className="handscroll-entry__image"
                          src={post.cover}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                      <ArrowUpRight
                        className="handscroll-entry__arrow"
                        size={20}
                        aria-hidden="true"
                      />
                    </Link>
                  ))
                ) : (
                  <IndexState
                    loading={postsLoading}
                    error={postsError}
                    empty="这一卷，还没有文章。"
                  />
                )}
              </div>
              <Link to="/posts" className="handscroll-text-link">
                阅全部文录 <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
          <section
            className="handscroll-panel handscroll-collection handscroll-projects"
            data-chapter
            aria-label="造物"
          >
            <ChapterTitle
              number="贰 / WORKS"
              title="造物"
              note="让想法，生出自己的模样。"
            />
            <div className="handscroll-collection__body">
              <div className="handscroll-list" aria-busy={reposLoading}>
                {!reposLoading && !reposError && projects.length ? (
                  projects.slice(0, 3).map((repo, index) => (
                    <a
                      key={repo.name}
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="handscroll-entry"
                    >
                      <span className="handscroll-entry__number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="handscroll-entry__copy">
                        <p className="handscroll-entry__meta">
                          {repo.language && <span>{repo.language}</span>}
                          <span>
                            <Star size={12} aria-hidden="true" />
                            {repo.stargazers_count}
                          </span>
                        </p>
                        <h3>{repo.name}</h3>
                        {repo.description && (
                          <p className="handscroll-entry__summary">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight
                        className="handscroll-entry__arrow"
                        size={20}
                        aria-hidden="true"
                      />
                    </a>
                  ))
                ) : (
                  <IndexState
                    loading={reposLoading}
                    error={reposError}
                    empty="新的想法，仍在酝酿。"
                  />
                )}
              </div>
              <a
                href="https://github.com/yurika0211"
                target="_blank"
                rel="noopener noreferrer"
                className="handscroll-text-link"
              >
                <Github size={17} aria-hidden="true" /> 去 GitHub 看看{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </section>
          <section
            className="handscroll-panel handscroll-colophon"
            data-chapter
            aria-label="余白"
          >
            <span className="handscroll-kicker">叁 / UNTIL NEXT TIME</span>
            <h2>
              卷有尽时，
              <br />
              余韵未央。
            </h2>
            <p>
              谢谢你，读到这里。
              <br />
              若有片刻共鸣，不妨留下一笔。
            </p>
            <Link to="/guestbook" className="handscroll-text-link">
              留一页小札 <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <div className="handscroll-colophon__foot">
              <span className="scroll-seal" aria-hidden="true">
                余白
              </span>
              <p>
                {latestPostDate && latestPostDate !== "--"
                  ? `最近落笔 ${latestPostDate}`
                  : "静候下一次落笔"}
                <br />© {new Date().getFullYear()} ユリカのブログ
              </p>
            </div>
          </section>
          <div className="scroll-rod scroll-rod--tail" aria-hidden="true" />
        </div>
      </div>
      <div className="handscroll-curl" aria-hidden="true">
        <span />
      </div>
      <div className="handscroll-controls">
        <div
          ref={progressRef}
          className="handscroll-progress"
          role="progressbar"
          aria-label="展卷进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <span />
        </div>
        <p id="handscroll-hint" className="handscroll-hint">
          <span className="handscroll-hint__desktop">
            滚动 / 拖动，徐徐展卷
          </span>
          <span className="handscroll-hint__touch">左右滑动，徐徐展卷</span>
        </p>
        <nav className="handscroll-chapters" aria-label="卷中章节">
          {CHAPTERS.map((label, index) => (
            <button
              key={label}
              aria-current={chapter === index ? "step" : undefined}
              onClick={() => goTo(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="handscroll-paging">
          <button
            onClick={() => goTo(chapter - 1)}
            disabled={chapter === 0}
            aria-label="上一章"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => goTo(chapter + 1)}
            disabled={chapter === CHAPTERS.length - 1}
            aria-label="下一章"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
