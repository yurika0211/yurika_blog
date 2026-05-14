import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock3,
  ExternalLink,
  Github,
  Loader,
  Mail,
  Newspaper,
  Pin,
  Star,
  Twitter,
  Workflow,
} from 'lucide-react';
import { formatDate } from '../utils/date';

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

type ReadingWallPanel = {
  id: string;
  widthClass: string;
  layoutClass: string;
  title?: string;
  body: ReactNode;
};

function Ruby({ base, note }: { base: string; note: string }) {
  return (
    <ruby className="reading-wall-ruby">
      {base}
      <rt>{note}</rt>
    </ruby>
  );
}

function Kaeri({ mark }: { mark: string }) {
  return <span className="reading-wall-kaeri">{mark}</span>;
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="reading-wall-vertical-copy">{children}</p>;
}

function CopyStack({ children }: { children: ReactNode }) {
  return <div className="reading-wall-copy-stack">{children}</div>;
}

function RichStatus({
  loading,
  error,
  loadingLabel,
}: {
  loading: boolean;
  error: string | null;
  loadingLabel: string;
}) {
  if (loading) {
    return (
      <div className="reading-wall-rich-status">
        <Loader className="h-4 w-4 animate-spin" />
        <span>{loadingLabel}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reading-wall-rich-status reading-wall-rich-status-error">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return null;
}

function ArticleSlip({ post, mode }: { post: ReadingWallPostCard; mode: 'featured' | 'recent' }) {
  return (
    <Link to={`/post/${post.id}`} className="reading-wall-rich-card group">
      <div className="reading-wall-rich-card-cover">
        {post.cover ? (
          <img
            src={post.cover}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${post.coverBg}`} />
        )}
      </div>

      <div className="reading-wall-rich-card-copy">
        <div className="reading-wall-rich-card-meta">
          <span className="inline-flex items-center gap-1">
            {mode === 'featured' ? <Pin className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}
            {mode === 'featured' ? '置顶' : '更新'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDate(post.date)}
          </span>
        </div>

        <h3 className="reading-wall-rich-card-title">{post.title}</h3>
        <p className="reading-wall-rich-card-summary">
          {post.summary || 'No summary yet.'}
        </p>
        <div className="reading-wall-rich-card-footer">
          <span className="truncate">{post.tags.slice(0, 2).join(' / ') || post.category || 'Article'}</span>
          <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-300">
            <BookOpen className="h-3.5 w-3.5" />
            阅读
          </span>
        </div>
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
      className="reading-wall-rich-card group"
    >
      <div className="reading-wall-rich-card-copy reading-wall-rich-card-copy-project">
        <div className="reading-wall-rich-card-meta">
          <span className="inline-flex items-center gap-1">
            <Workflow className="h-3.5 w-3.5" />
            {repo.language || 'Project'}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <Star className="h-3.5 w-3.5" />
            {repo.stargazers_count}
          </span>
        </div>

        <h3 className="reading-wall-rich-card-title">{repo.name}</h3>
        <p className="reading-wall-rich-card-summary">
          {repo.description || 'No description'}
        </p>
        <div className="reading-wall-rich-card-footer">
          <span className="truncate">GitHub Repository</span>
          <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-300">
            打开
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function RichPanel({
  kicker,
  title,
  action,
  loading,
  error,
  loadingLabel,
  emptyLabel,
  children,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
  loading: boolean;
  error: string | null;
  loadingLabel: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  const hasChildren = Boolean(children);

  return (
    <div className="reading-wall-rich-column">
      <div className="reading-wall-rich-layout">
        <div className="reading-wall-rich-body">
          <RichStatus loading={loading} error={error} loadingLabel={loadingLabel} />

          {!loading && !error ? (
            hasChildren ? (
              <div className="reading-wall-rich-list">{children}</div>
            ) : (
              <div className="reading-wall-rich-empty">{emptyLabel}</div>
            )
          ) : null}
        </div>

        <div className="reading-wall-rich-side">
          <p className="reading-wall-rich-kicker">{kicker}</p>
          <h3 className="reading-wall-rich-title">{title}</h3>
          {action ? (
            <div className="reading-wall-rich-side-action">{action}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HomeFooterRoll({ year }: { year: number }) {
  return (
    <div className="reading-wall-home-footer">
      <div className="reading-wall-home-footer-copy">
        <p>Copyright © {year} My DevBlog. All rights reserved.</p>
      </div>

      <div className="reading-wall-home-footer-icons" aria-label="Social links">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="reading-wall-home-footer-icon"
          title="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
        <a
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
          className="reading-wall-home-footer-icon"
          title="Twitter"
        >
          <Twitter className="h-4 w-4" />
        </a>
        <a
          href="mailto:your.email@example.com"
          className="reading-wall-home-footer-icon"
          title="Email"
        >
          <Mail className="h-4 w-4" />
        </a>
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
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth < 1024) {
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      rail.scrollBy({
        left: event.deltaY,
        behavior: 'auto',
      });
    };

    rail.addEventListener('wheel', handleWheel, { passive: false });
    return () => rail.removeEventListener('wheel', handleWheel);
  }, []);

  const panels = useMemo<ReadingWallPanel[]>(
    () => [
      {
        id: 'water-fairy-intro',
        widthClass: 'reading-wall-panel-narrow',
        layoutClass: 'reading-wall-panel-plaque',
        title: '水仙女',
        body: (
          <Paragraph>
            凌波照影，素袖生香。
          </Paragraph>
        ),
      },
      {
        id: 'water-fairy-prologue',
        widthClass: 'reading-wall-panel-medium',
        layoutClass: 'reading-wall-panel-folio-tall',
        title: '临波序',
        body: (
          <CopyStack>
            <Paragraph>
              晨雾初开，水面像一封刚被揭开的信。她自浅汀回眸，白瓣拢着月色，金盏藏着微光，连风也只敢轻轻掠过裙角。
            </Paragraph>
            <Paragraph>
              清波不语，却把天光与花影一并收留。人若驻足太久，便会误以为春色本来就生在水面，而不是从她的肩侧慢慢醒来。
            </Paragraph>
          </CopyStack>
        ),
      },
      {
        id: 'water-fairy-poem',
        widthClass: 'reading-wall-panel-wide',
        layoutClass: 'reading-wall-panel-scroll',
        body: (
          <CopyStack>
            <Paragraph>
              清波涵曉月，素影立寒汀。
            </Paragraph>
            <Paragraph>
              金盞盛<Kaeri mark="レ" />
              春色，香痕
              <Ruby base="著" note="ちゃく" />
              水青。
            </Paragraph>
            <Paragraph>
              風來衣袂動，露落佩聲輕。
            </Paragraph>
            <Paragraph>
              若問芳名處，人間喚水靈。
            </Paragraph>
          </CopyStack>
        ),
      },
      {
        id: 'water-fairy-scent',
        widthClass: 'reading-wall-panel-medium',
        layoutClass: 'reading-wall-panel-folio-mid',
        title: '香雾',
        body: (
          <Paragraph>
            她不是浓烈的花神，更像一缕被清水养大的气息。靠近时先闻见冷香，再看见雪白花瓣层层展开，像把春天折成一支细长的灯。
          </Paragraph>
        ),
      },
      {
        id: 'water-fairy-note',
        widthClass: 'reading-wall-panel-medium',
        layoutClass: 'reading-wall-panel-folio-low',
        title: '晓岸小札',
        body: (
          <Paragraph>
            若把清晨的池岸写成一封情书，第一句该是薄雾，第二句该是花影，第三句便是她停在水边时，整片天空都安静下来。
          </Paragraph>
        ),
      },
      {
        id: 'water-fairy-epilogue',
        widthClass: 'reading-wall-panel-narrow',
        layoutClass: 'reading-wall-panel-colophon',
        body: (
          <Paragraph>
            一泓秋水，照見芳魂。
          </Paragraph>
        ),
      },
      {
        id: 'home-bridge',
        widthClass: 'reading-wall-panel-medium',
        layoutClass: 'reading-wall-panel-folio-tall',
        title: '别卷',
        body: (
          <CopyStack>
            <Paragraph>
              水畔的花影写到这里，纸卷却还没有收束。再向右缓缓展开，便不是香雾与月色，而是这些年留下的文章、项目与近来的笔记。
            </Paragraph>
            <Paragraph>
              最近一笔记于{latestPostDate || '未定之日'}。若只想先看风景，停在此处即可；若还想继续翻阅，便请沿着卷尾再行几步。
            </Paragraph>
          </CopyStack>
        ),
      },
      {
        id: 'featured-posts',
        widthClass: 'reading-wall-panel-scroll',
        layoutClass: 'reading-wall-panel-scroll',
        title: '置顶',
        body: (
          <RichPanel
            kicker="Featured"
            title="卷中置顶文章"
            action={(
              <Link to="/posts" className="reading-wall-rich-link">
                全部文章
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            loading={postsLoading}
            error={postsError}
            loadingLabel="loading featured posts..."
            emptyLabel="暂时没有置顶文章。"
          >
            {featuredPosts.map((post) => (
              <ArticleSlip key={`featured-${post.id}`} post={post} mode="featured" />
            ))}
          </RichPanel>
        ),
      },
      {
        id: 'recent-posts',
        widthClass: 'reading-wall-panel-scroll',
        layoutClass: 'reading-wall-panel-scroll',
        title: '新稿',
        body: (
          <RichPanel
            kicker="Latest"
            title="卷中新近更新"
            action={(
              <Link to="/posts" className="reading-wall-rich-link">
                前往列表
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            loading={postsLoading}
            error={postsError}
            loadingLabel="loading recent posts..."
            emptyLabel="最近还没有新稿。"
          >
            {recentPosts.map((post) => (
              <ArticleSlip key={`recent-${post.id}`} post={post} mode="recent" />
            ))}
          </RichPanel>
        ),
      },
      {
        id: 'project-posts',
        widthClass: 'reading-wall-panel-scroll',
        layoutClass: 'reading-wall-panel-scroll',
        title: '项目',
        body: (
          <RichPanel
            kicker="Projects"
            title="卷中项目札记"
            action={(
              <a
                href="https://github.com/yurika0211"
                target="_blank"
                rel="noopener noreferrer"
                className="reading-wall-rich-link"
              >
                GitHub
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            loading={reposLoading}
            error={reposError}
            loadingLabel="loading repositories..."
            emptyLabel="暂时没有项目数据。"
          >
            {projects.map((repo) => (
              <RepoSlip key={repo.name} repo={repo} />
            ))}
          </RichPanel>
        ),
      },
      {
        id: 'home-epilogue',
        widthClass: 'reading-wall-panel-narrow',
        layoutClass: 'reading-wall-panel-colophon',
        title: '余波',
        body: (
          <Paragraph>
            卷尽向东，灯影未央。
          </Paragraph>
        ),
      },
      {
        id: 'home-footer-roll',
        widthClass: 'reading-wall-panel-narrow',
        layoutClass: 'reading-wall-panel-colophon',
        title: '页尾',
        body: <HomeFooterRoll year={currentYear} />,
      },
    ],
    [currentYear, featuredPosts, latestPostDate, postsError, postsLoading, projects, recentPosts, reposError, reposLoading],
  );

  return (
    <section className="reading-wall-section relative min-h-screen overflow-hidden bg-[#f5efe2] dark:bg-[#16110c]">
      <div className="hero-grid absolute inset-0 opacity-[0.14] mix-blend-multiply dark:opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,242,231,0.98)_0%,rgba(242,234,219,0.95)_46%,rgba(238,229,211,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(24,18,13,0.98)_0%,rgba(20,15,11,0.95)_48%,rgba(16,12,9,0.98)_100%)]" />
        <div className="absolute inset-x-[6%] top-[6%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.16),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.14),transparent)]" />
        <div className="absolute inset-x-[8%] bottom-[8%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.1),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.1),transparent)]" />
        <div className="absolute left-[-7rem] top-[10%] h-64 w-96 rounded-full bg-[radial-gradient(circle,rgba(84,61,34,0.12)_0%,rgba(84,61,34,0.06)_26%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(164,130,82,0.08)_0%,rgba(164,130,82,0.04)_22%,transparent_66%)]" />
        <div className="absolute right-[-5rem] top-[18%] h-72 w-80 rounded-full bg-[radial-gradient(circle,rgba(126,94,52,0.1)_0%,rgba(126,94,52,0.04)_24%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(150,118,73,0.08)_0%,rgba(150,118,73,0.04)_24%,transparent_68%)]" />
        <div className="absolute bottom-[-8rem] left-[24%] h-72 w-[34rem] bg-[radial-gradient(ellipse_at_center,rgba(109,80,42,0.08)_0%,rgba(109,80,42,0.04)_32%,transparent_72%)] blur-3xl dark:bg-[radial-gradient(ellipse_at_center,rgba(145,112,70,0.07)_0%,rgba(145,112,70,0.03)_28%,transparent_72%)]" />
        <div className="absolute left-[12%] top-[22%] h-40 w-24 rotate-[-16deg] rounded-full border border-[rgba(126,90,48,0.08)] opacity-60 dark:border-[rgba(176,140,92,0.08)]" />
        <div className="absolute right-[14%] top-[14%] h-52 w-28 rotate-[12deg] rounded-full border border-[rgba(126,90,48,0.06)] opacity-50 dark:border-[rgba(176,140,92,0.06)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] items-stretch px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <div
          ref={railRef}
          className="reading-wall-rail reading-wall-rail-full min-w-0"
          aria-label="Vertical reading wall"
        >
          {panels.map((panel) => (
            <article
              key={panel.id}
              className={`reading-wall-panel ${panel.widthClass} ${panel.layoutClass}`}
            >
              <div className="reading-wall-panel-surface">
                <div className="reading-wall-panel-shell">
                  {panel.title ? (
                    <>
                      <div className="reading-wall-column reading-wall-title-column">
                        <h2 className="reading-wall-vertical-title">{panel.title}</h2>
                      </div>
                      <div className="reading-wall-rule" />
                    </>
                  ) : null}

                  <div className="reading-wall-column reading-wall-copy-column">
                    {panel.body}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
