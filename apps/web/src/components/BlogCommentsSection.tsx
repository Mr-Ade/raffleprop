'use client';

import { useState, useTransition, useRef, useEffect } from 'react';

interface CommentUser { id: string; fullName: string; }
interface Reply { id: string; body: string; createdAt: string; user: CommentUser; }
interface Comment { id: string; body: string; createdAt: string; user: CommentUser; replies: Reply[]; }
interface CurrentUser { id: string; fullName: string; }

interface Props {
  pageSlug: string;
  initialComments: Comment[];
  currentUser: CurrentUser | null;
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--green-primary), var(--green-light))',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.33, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

async function postComment(slug: string, body: string): Promise<Comment> {
  const res = await fetch(`${API}/api/content/pages/${slug}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
    credentials: 'include',
  });
  const json = await res.json() as { success: boolean; data: Comment; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Failed to post comment');
  return json.data;
}

async function postReply(commentId: string, body: string): Promise<Reply> {
  const res = await fetch(`${API}/api/content/comments/${commentId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
    credentials: 'include',
  });
  const json = await res.json() as { success: boolean; data: Reply; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Failed to post reply');
  return json.data;
}

function CommentForm({ onSubmit, placeholder, buttonLabel = 'Post Comment', compact = false }: {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  buttonLabel?: string;
  compact?: boolean;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError('');
    startTransition(async () => {
      try {
        await onSubmit(body.trim());
        setBody('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder ?? 'Write a comment...'}
        rows={compact ? 2 : 3}
        maxLength={2000}
        required
        style={{
          width: '100%', resize: 'vertical', padding: '0.75rem',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
          background: 'var(--bg-secondary)', color: 'var(--text-primary)',
          fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !body.trim()}>
          {pending ? <><i className="fa-solid fa-spinner fa-spin" /> Posting…</> : <><i className="fa-solid fa-paper-plane" /> {buttonLabel}</>}
        </button>
      </div>
    </form>
  );
}

function ReplyItem({ reply }: { reply: Reply }) {
  return (
    <div style={{ display: 'flex', gap: '0.625rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '2px solid var(--green-primary)' }}>
      <Avatar name={reply.user.fullName} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>{reply.user.fullName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(reply.createdAt)}</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.body}</p>
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUser, onReplyPosted }: {
  comment: Comment;
  currentUser: CurrentUser | null;
  onReplyPosted: (commentId: string, reply: Reply) => void;
}) {
  const [showReply, setShowReply] = useState(false);

  async function handleReply(body: string) {
    const reply = await postReply(comment.id, body);
    onReplyPosted(comment.id, reply);
    setShowReply(false);
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem' }}>
      <Avatar name={comment.user.fullName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{comment.user.fullName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(comment.createdAt)}</span>
        </div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.body}</p>

        {currentUser && (
          <button
            type="button"
            onClick={() => setShowReply((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.775rem', color: 'var(--green-primary)', fontWeight: 600, padding: '0.125rem 0', marginBottom: '0.5rem' }}
          >
            <i className="fa-solid fa-reply" /> {showReply ? 'Cancel' : 'Reply'}
          </button>
        )}

        {showReply && (
          <div style={{ marginBottom: '0.75rem' }}>
            <CommentForm
              onSubmit={handleReply}
              placeholder={`Reply to ${comment.user.fullName}…`}
              buttonLabel="Post Reply"
              compact
            />
          </div>
        )}

        {comment.replies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {comment.replies.map((r) => <ReplyItem key={r.id} reply={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function BlogCommentsSection({ pageSlug, initialComments, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/content/pages/${pageSlug}/comments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j: { success: boolean; data: Comment[] }) => { if (j.success) setComments(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageSlug]);

  function handleReplyPosted(commentId: string, reply: Reply) {
    setComments((prev) => prev.map((c) =>
      c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
    ));
  }

  async function handleCommentPosted(body: string) {
    const comment = await postComment(pageSlug, body);
    setComments((prev) => [comment, ...prev]);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="blog-comments-section" style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)' }}>
      <div ref={topRef} />
      <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
        <i className="fa-regular fa-comments" style={{ marginRight: '0.5rem', color: 'var(--green-primary)' }} />
        Comments{comments.length > 0 && ` (${comments.length})`}
      </h2>

      {currentUser ? (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <Avatar name={currentUser.fullName} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', paddingTop: '0.5rem' }}>
              Commenting as <strong>{currentUser.fullName}</strong>
            </span>
          </div>
          <CommentForm onSubmit={handleCommentPosted} />
        </div>
      ) : (
        <div style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
          <i className="fa-regular fa-user-circle" style={{ fontSize: '1.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }} />
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Sign in to join the discussion
          </p>
          <a href="/login" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-sign-in-alt" /> Sign In
          </a>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading comments…</p>
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <i className="fa-regular fa-comments" style={{ fontSize: '2rem', marginBottom: '0.75rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onReplyPosted={handleReplyPosted}
            />
          ))}
        </div>
      )}
    </section>
  );
}
