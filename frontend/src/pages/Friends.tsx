import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Github,
  Globe,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  friendLinkProfile,
  friendLinkRules,
  friendLinkToneList,
  type FriendLinkTone,
} from '../data/friends';
import { useAuth } from '../hooks/useAuth';
import { friendLink, getApiErrorMessage } from '../services/api';
import type {
  FriendLinkApplication,
  FriendLinkApplicationPayload,
  FriendLinkStatus,
} from '../types';
import { formatDate } from '../utils/date';

const toneStyles: Record<
  FriendLinkTone,
  {
    halo: string;
    button: string;
  }
> = {
  sky: {
    halo: 'bg-sky-200/70 dark:bg-sky-500/20',
    button: 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400',
  },
  emerald: {
    halo: 'bg-emerald-200/70 dark:bg-emerald-500/20',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400',
  },
  amber: {
    halo: 'bg-amber-200/70 dark:bg-amber-500/20',
    button: 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400',
  },
  rose: {
    halo: 'bg-rose-200/70 dark:bg-rose-500/20',
    button: 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400',
  },
  violet: {
    halo: 'bg-violet-200/70 dark:bg-violet-500/20',
    button: 'bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400',
  },
};

type SubmissionState = {
  status: 'success' | 'error';
  message: string;
} | null;

type ReviewFilter = 'all' | FriendLinkStatus;

const initialForm: FriendLinkApplicationPayload = {
  site_name: '',
  site_url: '',
  description: '',
  avatar_url: '',
};

const getToneForLink = (seed: string): FriendLinkTone => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return friendLinkToneList[Math.abs(hash) % friendLinkToneList.length];
};

const getHostName = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getStatusBadgeClass = (status: FriendLinkStatus) => {
  if (status === 'approved') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (status === 'rejected') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }
  return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const getStatusLabel = (status: FriendLinkStatus) => {
  if (status === 'approved') {
    return '已通过';
  }
  if (status === 'rejected') {
    return '已拒绝';
  }
  return '待审核';
};

export default function Friends() {
  const { isLoggedIn, username } = useAuth();
  const [approvedLinks, setApprovedLinks] = useState<FriendLinkApplication[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedError, setApprovedError] = useState<string | null>(null);

  const [form, setForm] = useState<FriendLinkApplicationPayload>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>(null);

  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('pending');
  const [applications, setApplications] = useState<FriendLinkApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const loadApprovedLinks = async () => {
      try {
        setApprovedLoading(true);
        setApprovedError(null);
        const data = await friendLink.getApproved();
        if (active) {
          setApprovedLinks(data);
        }
      } catch (error) {
        if (active) {
          setApprovedError(getApiErrorMessage(error, '加载友链失败，请稍后再试。'));
        }
      } finally {
        if (active) {
          setApprovedLoading(false);
        }
      }
    };

    void loadApprovedLinks();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setApplications([]);
      setApplicationsError(null);
      setApplicationsLoading(false);
      return;
    }

    let active = true;

    const loadApplications = async () => {
      try {
        setApplicationsLoading(true);
        setApplicationsError(null);
        const data = await friendLink.getApplications(reviewFilter);
        if (active) {
          setApplications(data);
        }
      } catch (error) {
        if (active) {
          setApplicationsError(getApiErrorMessage(error, '加载友链申请失败。'));
        }
      } finally {
        if (active) {
          setApplicationsLoading(false);
        }
      }
    };

    void loadApplications();

    return () => {
      active = false;
    };
  }, [isLoggedIn, reviewFilter]);

  const refreshApprovedLinks = async () => {
    try {
      setApprovedLoading(true);
      setApprovedError(null);
      const data = await friendLink.getApproved();
      setApprovedLinks(data);
    } catch (error) {
      setApprovedError(getApiErrorMessage(error, '加载友链失败，请稍后再试。'));
    } finally {
      setApprovedLoading(false);
    }
  };

  const refreshApplications = async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      setApplicationsLoading(true);
      setApplicationsError(null);
      const data = await friendLink.getApplications(reviewFilter);
      setApplications(data);
    } catch (error) {
      setApplicationsError(getApiErrorMessage(error, '加载友链申请失败。'));
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleInputChange = (
    key: keyof FriendLinkApplicationPayload,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setSubmissionState(null);
      await friendLink.createApplication(form);
      setForm(initialForm);
      setSubmissionState({
        status: 'success',
        message: '友链申请已提交，等待审核。',
      });

      if (isLoggedIn) {
        await refreshApplications();
      }
    } catch (error) {
      setSubmissionState({
        status: 'error',
        message: getApiErrorMessage(error, '提交失败，请稍后再试。'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (applicationId: number, status: FriendLinkStatus) => {
    try {
      setActingId(applicationId);
      setApplicationsError(null);
      await friendLink.reviewApplication(applicationId, { status });
      await Promise.all([refreshApplications(), refreshApprovedLinks()]);
    } catch (error) {
      setApplicationsError(getApiErrorMessage(error, '审核操作失败，请稍后再试。'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-8 lg:space-y-10 animate-fade-in">
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              友情链接墙
            </h2>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
              通过审核的网站会自动展示在这里。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refreshApprovedLinks();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300 dark:hover:bg-gray-950/50"
          >
            <RefreshCcw className={`h-4 w-4 ${approvedLoading ? 'animate-spin' : ''}`} />
            刷新友链
          </button>
        </div>

        {approvedLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[1.75rem] border border-gray-200/80 bg-slate-100/50 px-6 py-14 text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            正在加载友链...
          </div>
        ) : approvedError ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50/80 px-6 py-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              加载友链失败
            </div>
            <p className="mt-2">{approvedError}</p>
          </div>
        ) : approvedLinks.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-slate-100/50 px-6 py-14 text-center shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm dark:bg-gray-950/40 dark:text-sky-300">
              <Globe className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
              还没有已通过的友链
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              你可以在下方提交申请，审核通过后会自动显示在这里。
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {approvedLinks.map((item) => {
              const tone = toneStyles[getToneForLink(`${item.id}-${item.site_url}`)];

              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-slate-100/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/30"
                >
                  <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl ${tone.halo}`} />

                  <div className="relative p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
                          {getHostName(item.site_url)}
                        </p>
                        <h3 className="mt-2 truncate text-2xl font-bold text-gray-900 transition-colors group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-300">
                          {item.site_name}
                        </h3>
                      </div>
                      <img
                        src={item.avatar_url}
                        alt={`${item.site_name} 头像`}
                        className="h-12 w-12 shrink-0 rounded-2xl border border-white/80 object-cover shadow-sm dark:border-gray-800"
                      />
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                      {item.description}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {item.reviewed_at
                          ? `审核通过于 ${formatDate(item.reviewed_at)}`
                          : `提交于 ${formatDate(item.created_at)}`}
                      </span>
                      <a
                        href={item.site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${tone.button}`}
                      >
                        访问网站
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-gray-200/80 bg-slate-100/50 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30">
        <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-sky-200/60 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-500/10" />

        <div className="relative px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300">
              <Link2 className="h-4 w-4" />
              友情链接
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900 dark:text-white lg:text-5xl">
              友情链接
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600 dark:text-gray-300 lg:text-lg">
              这里会展示所有已通过审核的友链。你可以在下方提交新申请；登录后也可以在同页进行审核。
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">已收录站点</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {approvedLinks.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">必填项</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {friendLinkRules.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">当前模式</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {isLoggedIn ? '管理模式' : '公开模式'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-gray-200/80 bg-slate-100/50 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30 lg:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <FileText className="h-3.5 w-3.5" />
          交换申请
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {friendLinkProfile.title}
            </h2>
            <p className="mt-2 text-sm text-sky-700 dark:text-sky-300">
              {friendLinkProfile.subtitle}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              {friendLinkProfile.description}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  网站名称
                </label>
                <input
                  value={form.site_name}
                  onChange={(event) => handleInputChange('site_name', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-500 dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-100"
                  placeholder="例如：Alice Blog"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  网站地址
                </label>
                <input
                  value={form.site_url}
                  onChange={(event) => handleInputChange('site_url', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-500 dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-100"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  一句话简介
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => handleInputChange('description', event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-500 dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-100"
                  placeholder="用一句话介绍你的网站。"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  头像地址
                </label>
                <input
                  value={form.avatar_url}
                  onChange={(event) => handleInputChange('avatar_url', event.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-500 dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-100"
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4" />
                      提交申请
                    </>
                  )}
                </button>

                <a
                  href={friendLinkProfile.contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-200 dark:hover:bg-gray-950/50"
                >
                  <Github className="h-4 w-4" />
                  {friendLinkProfile.contactLabel}
                </a>
              </div>

              {submissionState && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    submissionState.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}
                >
                  {submissionState.message}
                </div>
              )}
            </form>
          </div>

          <div className="rounded-[1.5rem] border border-white/80 bg-white/75 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/35">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              需要提供的信息
            </div>
            <div className="mt-4 space-y-3">
              {friendLinkRules.map((rule, index) => (
                <div key={rule} className="flex items-start gap-3 rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900/70 dark:text-gray-300">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {index + 1}
                  </span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-7 text-gray-500 dark:text-gray-400">
              未登录访客也可以直接提交申请。登录后会显示下方审核面板，可立即通过或拒绝申请。
            </p>
          </div>
        </div>
      </section>

      {isLoggedIn && (
        <section className="rounded-[1.75rem] border border-gray-200/80 bg-slate-100/50 p-6 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/30 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                管理审核
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                友链审核面板
              </h2>
              <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
                当前登录：{username}。你可以在这里审核友链申请。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ['pending', '待审核'],
                ['approved', '已通过'],
                ['rejected', '已拒绝'],
                ['all', '全部'],
              ] as Array<[ReviewFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReviewFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    reviewFilter === value
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'border border-gray-200 bg-white/70 text-gray-600 hover:bg-white dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300 dark:hover:bg-gray-950/50'
                  }`}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  void refreshApplications();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-300 dark:hover:bg-gray-950/50"
              >
                <RefreshCcw className={`h-4 w-4 ${applicationsLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>

          <div className="mt-6">
            {applicationsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white/60 px-6 py-10 text-gray-600 dark:border-gray-800 dark:bg-gray-950/20 dark:text-gray-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在加载审核列表...
              </div>
            ) : applicationsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  加载审核列表失败
                </div>
                <p className="mt-2">{applicationsError}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/20 dark:text-gray-400">
                当前筛选条件下没有匹配的友链申请。
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.5rem] border border-gray-200/80 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/25"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-4">
                          <img
                            src={item.avatar_url}
                            alt={`${item.site_name} 头像`}
                            className="h-14 w-14 shrink-0 rounded-2xl border border-white/80 object-cover shadow-sm dark:border-gray-800"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-xl font-bold text-gray-900 dark:text-white">
                                {item.site_name}
                              </h3>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </div>
                            <a
                              href={item.site_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              {item.site_url}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                              {item.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>提交：{formatDate(item.created_at)}</span>
                              <span>更新：{formatDate(item.updated_at)}</span>
                              {item.reviewed_at && <span>审核：{formatDate(item.reviewed_at)}</span>}
                            </div>
                            {item.review_note && (
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                审核备注：{item.review_note}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => {
                            void handleReview(item.id, 'approved');
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {actingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          通过
                        </button>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => {
                            void handleReview(item.id, 'rejected');
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {actingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          拒绝
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
