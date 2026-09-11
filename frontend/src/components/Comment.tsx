import { Trash2 } from "lucide-react";
import type { BlogComment } from "../types";
import { formatDate } from "../utils/date";

interface CommentProps {
 comment: BlogComment;
 onDelete: () => void;
 isDeleting?: boolean;
 canDelete?: boolean;
}

export default function Comment({
 comment,
 onDelete,
 isDeleting = false,
 canDelete = true,
}: CommentProps) {
 return (
    <div className="rounded-[0.16rem] border border-[color:var(--hair)] bg-[color:var(--paper)] p-4 dark:border-[color:var(--hair)] ">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-[color:var(--ink)] ">
          {comment.author}
        </p>
        <time className="text-xs text-[color:var(--ink-soft)] dark:text-[color:var(--ink-soft)]" dateTime={comment.date}>
          {formatDate(comment.date)}
        </time>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink)] ">
        {comment.content}
      </p>

      {canDelete && (
        <div className="mt-3 flex items-center gap-2">
          <button
 type="button"
 onClick={onDelete}
 disabled={isDeleting}
 className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs text-[color:var(--seal)] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:text-[color:var(--seal)] dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Deleting..." : "Delete comment"}
          </button>
        </div>
      )}
    </div>
  );
}
