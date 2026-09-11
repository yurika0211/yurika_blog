import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ExternalLink, Github, Loader, Star } from 'lucide-react';
import { formatDate } from '../utils/date';
import { attachHorizontalWheel, lockDocumentScroll } from '../utils/scroll';

/**
 * 旧卷的诗文原稿。手卷的引首本来只有一小段题字，六屏诗文会把节奏拖垮，
 * 所以画心让给了文章与项目，这几段留在这里备查，随时可以换回引首。
 *
 *   〈水仙女〉    凌波照影，素袖生香。
 *
 *   〈临波序〉    晨雾初开，水面像一封刚被揭开的信。她自浅汀回眸，
 *                白瓣拢着月色，金盏藏着微光，连风也只敢轻轻掠过裙角。
 *                清波不语，却把天光与花影一并收留。人若驻足太久，
 *                便会误以为春色本来就生在水面，而不是从她的肩侧慢慢醒来。
 *
 *   〈五言〉      清波涵曉月，素影立寒汀。
 *                金盞盛レ春色，香痕著（チャク）水青。
 *                風來衣袂動，露落佩聲輕。
 *                若問芳名處，人間喚水靈。
 *
 *   〈香雾〉      她不是浓烈的花神，更像一缕被清水养大的气息。靠近时先闻见冷香，
 *                再看见雪白花瓣层层展开，像把春天折成一支细长的灯。
 *
 *   〈晓岸小札〉  若把清晨的池岸写成一封情书，第一句该是薄雾，第二句该是花影，
 *                第三句便是她停在水边时，整片天空都安静下来。
 *
 *   〈余波〉      一泓秋水，照見芳魂。／ 卷尽向东，灯影未央。
 */

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

type ScrollLeaf = {
  id: string;
  width: 'slim' | 'mid' | 'wide';
  title: string;
  kana: string;
  body: ReactNode;
};

function ScrollNote({
  loading,
  error,
  loadingLabel,
  emptyLabel,
  isEmpty,
}: {
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  emptyLabel: string;
  isEmpty: boolean;
}) {
  if (loading) {
    return (
      <p className="scroll-note">
        <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{loadingLabel}</span>
      </p>
    );
  }

  if (error) {
    return (
      <p className="scroll-note scroll-note--error">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }

  if (isEmpty) {
    return <p className="scroll-note">{emptyLabel}</p>;
  }

  return null;
}

function ArticleSlip({ post }: { post: ReadingWallPostCard }) {
  return (
    <Link to={`/post/${post.id}`} className="scroll-slip">
      <div className="scroll-slip-cover">
        {post.cover ? (
          <img src={post.cover} alt="" loading="lazy" />
        ) : (
          <div className={`bg-gradient-to-br ${post.coverBg}`} />
        )}
      </div>

      <div className="scroll-slip-text">
        <h3 className="scroll-slip-title">{post.title}</h3>
        <p className="scroll-slip-summary">{post.summary || '未著小序。'}</p>
        <p className="scroll-slip-mark">{formatDate(post.date)}</p>
      </div>
    </Link>
  );
}

function RepoSlip({ repo }: { repo: ReadingWallRepoCard }) {
  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="scroll-slip"
    >
      <div className="scroll-slip-text">
        <h3 className="scroll-slip-title">{repo.name}</h3>
        <p className="scroll-slip-summary">{repo.description || '未著说明。'}</p>
        <p className="scroll-slip-mark">
          <Star className="h-3 w-3" aria-hidden="true" />
          {`${repo.stargazers_count}${repo.language ? ` · ${repo.language}` : ''}`}
        </p>
      </div>
    </a>
  );
}

function ScrollIndex({
  loading,
  error,
  loadingLabel,
  emptyLabel,
  action,
  children,
}: {
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  emptyLabel: string;
  action: ReactNode;
  children: ReactNode[];
}) {
  const ready = !loading && !error && children.length > 0;

  return (
    <div className="scroll-index">
      {ready ? (
        children
      ) : (
        <ScrollNote
          loading={loading}
          error={error}
          loadingLabel={loadingLabel}
          emptyLabel={emptyLabel}
          isEmpty={children.length === 0}
        />
      )}

      <div className="scroll-index-tail">{action}</div>
    </div>
  );
}

function Colophon({ year, latestPostDate }: { year: number; latestPostDate: string }) {
  return (
    <div className="scroll-colophon">
      <p className="scroll-colophon-copy scroll-colophon-copy--lead">
        卷尽向东，灯影未央。
      </p>
      <p className="scroll-colophon-copy">
        最近一笔记于{latestPostDate || '未定之日'}。
        {` Copyright © ${year} My DevBlog. All rights reserved.`}
      </p>

      <div className="scroll-colophon-marks">
        <a
          href="https://github.com/yurika0211"
          target="_blank"
          rel="noopener noreferrer"
          className="scroll-link"
          aria-label="GitHub"
        >
          <Github aria-hidden="true" />
        </a>
        <span className="scroll-seal scroll-seal--solid" aria-hidden="true">
          余波
        </span>
      </div>
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
  const railRef = useRef<HTMLDivElement | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    return lockDocumentScroll();
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    return attachHorizontalWheel(rail);
  }, []);

  const leaves = useMemo<ScrollLeaf[]>(
    () => [
      {
        id: 'title-slip',
        width: 'slim',
        title: '水仙女',
        kana: 'スイセンジョ',
        body: (
          <div className="scroll-copy-col">
            <p className="scroll-copy">凌波照影，素袖生香。</p>
            <span className="scroll-seal" aria-hidden="true">水僊</span>
          </div>
        ),
      },
      {
        id: 'frontispiece',
        width: 'mid',
        title: '临波序',
        kana: 'リンパノジョ',
        body: (
          <div className="scroll-copy-col">
            <p className="scroll-copy">
              晨雾初开，水面像一封刚被揭开的信。她自浅汀回眸，白瓣拢着月色，金盏藏着微光，连风也只敢轻轻掠过裙角。
            </p>
            <span className="scroll-seal" aria-hidden="true">臨波</span>
          </div>
        ),
      },
      {
        id: 'featured-posts',
        width: 'wide',
        title: '置顶',
        kana: 'チョウカン',
        body: (
          <ScrollIndex
            loading={postsLoading}
            error={postsError}
            loadingLabel="正在展卷…"
            emptyLabel="暂时没有置顶文章。"
            action={(
              <Link to="/posts" className="scroll-link">
                全部文章
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
          >
            {featuredPosts.map((post) => (
              <ArticleSlip key={`featured-${post.id}`} post={post} />
            ))}
          </ScrollIndex>
        ),
      },
      {
        id: 'recent-posts',
        width: 'wide',
        title: '新稿',
        kana: 'シンコウ',
        body: (
          <ScrollIndex
            loading={postsLoading}
            error={postsError}
            loadingLabel="正在展卷…"
            emptyLabel="最近还没有新稿。"
            action={(
              <Link to="/posts" className="scroll-link">
                前往列表
                <ArrowRight aria-hidden="true" />
              </Link>
            )}
          >
            {recentPosts.map((post) => (
              <ArticleSlip key={`recent-${post.id}`} post={post} />
            ))}
          </ScrollIndex>
        ),
      },
      {
        id: 'projects',
        width: 'wide',
        title: '项目',
        kana: 'コウモク',
        body: (
          <ScrollIndex
            loading={reposLoading}
            error={reposError}
            loadingLabel="正在展卷…"
            emptyLabel="暂时没有项目数据。"
            action={(
              <a
                href="https://github.com/yurika0211"
                target="_blank"
                rel="noopener noreferrer"
                className="scroll-link"
              >
                仓库
                <ExternalLink aria-hidden="true" />
              </a>
            )}
          >
            {projects.map((repo) => (
              <RepoSlip key={repo.name} repo={repo} />
            ))}
          </ScrollIndex>
        ),
      },
      {
        id: 'colophon',
        width: 'mid',
        title: '拖尾',
        kana: 'タクビ',
        body: <Colophon year={currentYear} latestPostDate={latestPostDate} />,
      },
    ],
    [
      currentYear,
      featuredPosts,
      latestPostDate,
      postsError,
      postsLoading,
      projects,
      recentPosts,
      reposError,
      reposLoading,
    ],
  );

  return (
    <section className="scroll-stage">
      <div ref={railRef} className="scroll-rail" aria-label="手卷">
        <div className="scroll-mount">
          <div className="scroll-rod scroll-rod--head" aria-hidden="true" />

          {leaves.map((leaf) => (
            <section key={leaf.id} className={`scroll-leaf scroll-leaf--${leaf.width}`}>
              <div className="scroll-label">
                <h2 className="scroll-title">{leaf.title}</h2>
                <p className="scroll-title-kana">{leaf.kana}</p>
              </div>

              {leaf.body}
            </section>
          ))}

          <div className="scroll-rod scroll-rod--tail" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
