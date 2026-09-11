import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Github,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { friendLinkProfile, friendLinkRules } from '../data/friends';
import { useAuth } from '../hooks/useAuth';
import { attachHorizontalWheel, lockDocumentScroll } from '../utils/scroll';
import { friendLink, getApiErrorMessage } from '../services/api';
import type {
  FriendLinkApplication,
  FriendLinkApplicationPayload,
  FriendLinkStatus,
} from '../types';
import { formatDate } from '../utils/date';

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

const getHostName = (url: string): string => {
 try {
 return new URL(url).hostname;
  } catch {
 return url;
  }
};

const getStatusBadgeClass = (status: FriendLinkStatus) => {
 if (status === 'approved') {
 return 'bg-[color:var(--seal)] text-[color:var(--seal)] dark:text-[color:var(--seal)]';
  }
 if (status === 'rejected') {
 return 'bg-[color:var(--seal)] text-[color:var(--seal)]  ';
  }
 return 'bg-[color:var(--paper)] text-[color:var(--seal)] dark:text-[color:var(--seal)]';
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
 const railRef = useRef<HTMLDivElement | null>(null);
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

 useEffect(() => lockDocumentScroll(), []);

 useEffect(() => {
 const rail = railRef.current;
 if (!rail) {
 return;
    }
 return attachHorizontalWheel(rail);
  }, []);

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
    <section className="scroll-stage">
      <div ref={railRef} className="scroll-rail" aria-label="友邻手卷">
        <div className="scroll-mount">
          <div className="scroll-rod scroll-rod--head" aria-hidden="true" />

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">友邻</h2>
              <p className="scroll-title-kana">ユウリン</p>
            </div>

            <div className="scroll-copy-col">
              <p className="scroll-copy">通过审核的网站会自动列于此卷。若要交换，请沿卷向右至「投帖」一段。</p>
              <span className="scroll-seal" aria-hidden="true">友鄰</span>
            </div>

            <div className="scroll-plain scroll-plain--narrow scroll-plain--center">
              <button
 type="button"
 onClick={() => {
 void refreshApprovedLinks();
                }}
 className="scroll-button scroll-button--quiet"
              >
                <RefreshCcw className={`h-4 w-4 ${approvedLoading ? 'animate-spin' : ''}`} />
                刷新友链
              </button>
            </div>
          </section>

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">链名</h2>
              <p className="scroll-title-kana">リンクめい</p>
            </div>

            <div className="scroll-index">
        {approvedLoading ? (
          <p className="scroll-note">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在展卷…
          </p>
        ) : approvedError ? (
          <p className="scroll-note scroll-note--error">
            <AlertCircle className="h-4 w-4" />
            {approvedError}
          </p>
        ) : approvedLinks.length === 0 ? (
          <p className="scroll-note">还没有已通过的友链，右行可投帖。</p>
        ) : (
 approvedLinks.map((item) => (
            <a
 key={item.id}
 href={item.site_url}
 target="_blank"
 rel="noopener noreferrer"
 className="scroll-slip"
            >
              <div className="scroll-slip-cover">
                <img src={item.avatar_url} alt="" loading="lazy" />
              </div>

              <div className="scroll-slip-text">
                <h3 className="scroll-slip-title">{item.site_name}</h3>
                <p className="scroll-slip-summary">{item.description}</p>
                <p className="scroll-slip-mark">{getHostName(item.site_url)}</p>
              </div>
            </a>
          ))
        )}
            </div>
          </section>


          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">规约</h2>
              <p className="scroll-title-kana">キヤク</p>
            </div>
            <div className="scroll-plain scroll-plain--sheet">

        <div className="relative px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-2 text-sm font-medium text-[color:var(--seal)] dark:text-[color:var(--seal)]">
              <Link2 className="h-4 w-4" />
              友情链接
            </div>

            <h1 className="mt-5 text-3xl font-bold text-[color:var(--ink)] lg:text-5xl">
              友情链接
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--ink)] lg:text-lg">
              这里会展示所有已通过审核的友链。你可以在下方提交新申请；登录后也可以在同页进行审核。
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] p-5 dark:border-[color:var(--hair)] ">
                <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">已收录站点</p>
                <p className="mt-2 text-3xl font-bold text-[color:var(--ink)] ">
                  {approvedLinks.length}
                </p>
              </div>
              <div className="rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] p-5 dark:border-[color:var(--hair)] ">
                <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">必填项</p>
                <p className="mt-2 text-3xl font-bold text-[color:var(--ink)] ">
                  {friendLinkRules.length}
                </p>
              </div>
              <div className="rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] p-5 dark:border-[color:var(--hair)] ">
                <p className="text-sm text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">当前模式</p>
                <p className="mt-2 text-3xl font-bold text-[color:var(--seal)] dark:text-[color:var(--seal)]">
                  {isLoggedIn ? '管理模式' : '公开模式'}
                </p>
              </div>
            </div>
          </div>
        </div>
            </div>
          </section>

          <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">投帖</h2>
              <p className="scroll-title-kana">トウチヨウ</p>
            </div>
            <div className="scroll-plain scroll-plain--sheet">

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--ink)] ">
              {friendLinkProfile.title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--seal)] dark:text-[color:var(--seal)]">
              {friendLinkProfile.subtitle}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink)] ">
              {friendLinkProfile.description}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--ink)] ">
                  网站名称
                </label>
                <input
 value={form.site_name}
 onChange={(event) => handleInputChange('site_name', event.target.value)}
 className="w-full rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="例如：Alice Blog"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--ink)] ">
                  网站地址
                </label>
                <input
 value={form.site_url}
 onChange={(event) => handleInputChange('site_url', event.target.value)}
 className="w-full rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--ink)] ">
                  一句话简介
                </label>
                <textarea
 value={form.description}
 onChange={(event) => handleInputChange('description', event.target.value)}
 rows={3}
 className="w-full rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="用一句话介绍你的网站。"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--ink)] ">
                  头像地址
                </label>
                <input
 value={form.avatar_url}
 onChange={(event) => handleInputChange('avatar_url', event.target.value)}
 className="w-full rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="https://example.com/avatar.png"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
 type="submit"
 disabled={submitting}
 className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[color:var(--paper)] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[color:var(--paper)] dark:text-[color:var(--ink)] dark:hover:bg-[color:var(--paper)]"
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
 className="inline-flex items-center gap-2 rounded-full border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-2.5 text-sm font-medium text-[color:var(--ink)] transition-colors hover:bg-[color:var(--paper)] dark:border-[color:var(--hair)] dark:hover:bg-[color:var(--paper)]"
                >
                  <Github className="h-4 w-4" />
                  {friendLinkProfile.contactLabel}
                </a>
              </div>

              {submissionState && (
                <div
 className={`rounded-[0.16rem] border px-4 py-3 text-sm ${
 submissionState.status === 'success'
                      ? 'border-[color:var(--hair)] bg-[color:var(--seal)] text-[color:var(--seal)] dark:text-[color:var(--seal)]'
                      : 'border-red-200 bg-[color:var(--seal)] text-[color:var(--seal)] dark:border-red-800 dark:bg-[color:var(--seal)]/20 dark:text-[color:var(--seal)]'
                  }`}
                >
                  {submissionState.message}
                </div>
              )}
            </form>
          </div>

          <div className="rounded-[1.5rem] border border-[color:var(--hair)] bg-white/75 p-5 dark:border-[color:var(--hair)] ">
            <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper)] px-3 py-1 text-xs font-medium text-[color:var(--seal)] dark:text-[color:var(--seal)]">
              <Sparkles className="h-3.5 w-3.5" />
              需要提供的信息
            </div>
            <div className="mt-4 space-y-3">
              {friendLinkRules.map((rule, index) => (
                <div key={rule} className="flex items-start gap-3 rounded-[0.16rem] bg-slate-50/90 px-4 py-3 text-sm text-[color:var(--ink)]  ">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--seal)] text-xs font-semibold text-[color:var(--seal)] dark:text-[color:var(--seal)]">
                    {index + 1}
                  </span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-7 text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">
              未登录访客也可以直接提交申请。登录后会显示下方审核面板，可立即通过或拒绝申请。
            </p>
          </div>
        </div>
            </div>
          </section>

      {isLoggedIn && (
        <section className="scroll-leaf scroll-leaf--wide">
            <div className="scroll-label">
              <h2 className="scroll-title">审帖</h2>
              <p className="scroll-title-kana">シンチヨウ</p>
            </div>
            <div className="scroll-plain scroll-plain--sheet">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--seal)] px-3 py-1 text-xs font-medium text-[color:var(--seal)] dark:text-[color:var(--seal)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                管理审核
              </div>
              <h2 className="mt-3 text-2xl font-bold text-[color:var(--ink)] ">
                友链审核面板
              </h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink)] ">
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
                      ? 'bg-gray-900 text-white dark:bg-[color:var(--paper)] dark:text-[color:var(--ink)]'
                      : 'border border-[color:var(--hair)] bg-[color:var(--paper)] text-[color:var(--ink)] hover:bg-[color:var(--paper)] dark:border-[color:var(--hair)] dark:hover:bg-[color:var(--paper)]'
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
 className="inline-flex items-center gap-2 rounded-full border border-[color:var(--hair)] bg-[color:var(--paper)] px-4 py-2 text-sm text-[color:var(--ink)] transition-colors hover:bg-[color:var(--paper)] dark:border-[color:var(--hair)] dark:hover:bg-[color:var(--paper)]"
              >
                <RefreshCcw className={`h-4 w-4 ${applicationsLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>

          <div className="mt-6">
            {applicationsLoading ? (
              <div className="flex items-center justify-center gap-3 rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-6 py-10 text-[color:var(--ink)] dark:border-[color:var(--hair)]  ">
                <Loader2 className="h-5 w-5 animate-spin" />
                正在加载审核列表...
              </div>
            ) : applicationsError ? (
              <div className="rounded-[0.16rem] border border-red-200 bg-[color:var(--seal)]/80 px-4 py-4 text-sm text-[color:var(--seal)] dark:border-red-800 dark:bg-[color:var(--seal)]/20 dark:text-[color:var(--seal)]">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  加载审核列表失败
                </div>
                <p className="mt-2">{applicationsError}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-[0.16rem] border border-dashed border-[color:var(--hair)] bg-[color:var(--paper)] px-6 py-10 text-center text-sm text-[color:var(--ink-soft)] dark:border-[color:var(--hair)] dark:text-[color:var(--ink-soft)]">
                当前筛选条件下没有匹配的友链申请。
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((item) => (
                  <article
 key={item.id}
 className="rounded-[1.5rem] border border-[color:var(--hair)] bg-[color:var(--paper)] p-5 dark:border-[color:var(--hair)] "
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-4">
                          <img
 src={item.avatar_url}
 alt={`${item.site_name} 头像`}
 className="h-14 w-14 shrink-0 rounded-[0.16rem] border border-[color:var(--hair)] object-cover dark:border-[color:var(--hair)]"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-xl font-bold text-[color:var(--ink)] ">
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
 className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--seal)] hover:text-[color:var(--seal)] dark:text-[color:var(--seal)] dark:hover:text-[color:var(--seal)]"
                            >
                              {item.site_url}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <p className="mt-3 text-sm leading-7 text-[color:var(--ink)] ">
                              {item.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">
                              <span>提交：{formatDate(item.created_at)}</span>
                              <span>更新：{formatDate(item.updated_at)}</span>
                              {item.reviewed_at && <span>审核：{formatDate(item.reviewed_at)}</span>}
                            </div>
                            {item.review_note && (
                              <p className="mt-2 text-xs text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]">
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
 className="inline-flex items-center gap-2 rounded-full bg-[color:var(--seal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--seal)] disabled:cursor-not-allowed disabled:opacity-70"
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
 className="inline-flex items-center gap-2 rounded-full bg-[color:var(--seal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[color:var(--seal)] disabled:cursor-not-allowed disabled:opacity-70"
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
            </div>
          </section>
          )}

          <div className="scroll-rod scroll-rod--tail" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
