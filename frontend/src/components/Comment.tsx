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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {comment.author}
        </p>
        <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={comment.date}>
          {formatDate(comment.date)}
        </time>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
        {comment.content}
      </p>

      {canDelete && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "删除中..." : "删除评论"}
          </button>
        </div>
      )}
    </div>
  );
}
