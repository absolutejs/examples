import {
  Component,
  computed,
  inject,
  Input,
  type OnInit,
} from "@angular/core";
import { SyncCollectionService } from "@absolutejs/sync/angular";

type CommentReactionRow = {
  id: string;
  commentId: string;
  actorId: string;
  emoji: string;
  createdAt: number;
};

const REACTION_PALETTE = ["👍", "❤️", "🎉"] as const;

@Component({
  selector: "comment-reactions",
  standalone: true,
  template: `
    <span [attr.data-testid]="'comment-reactions-' + commentId">
      @for (emoji of palette; track emoji) {
        <button
          [attr.data-testid]="'reaction-' + commentId + '-' + emoji"
          type="button"
          [style.background]="
            mine().has(emoji) ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
          "
          [style.border]="
            '1px solid ' +
            (mine().has(emoji) ? '#6366f1' : 'rgba(255,255,255,0.15)')
          "
          [style.borderRadius]="'12px'"
          [style.cursor]="'pointer'"
          [style.fontSize]="'0.9em'"
          [style.marginRight]="'4px'"
          [style.padding]="'0 6px'"
          (click)="toggle(emoji)"
        >
          {{ emoji }} {{ counts().get(emoji) ?? 0 }}
        </button>
      }
    </span>
  `,
})
export class CommentReactionsComponent implements OnInit {
  @Input({ required: true }) commentId!: string;
  @Input({ required: true }) wsUrl!: string;
  @Input({ required: true }) myUserId!: string;

  palette = REACTION_PALETTE;

  private sync = inject(SyncCollectionService);
  private handle: { data: () => CommentReactionRow[] } | undefined;

  counts = computed(() => {
    const handle = this.handle;
    if (handle === undefined) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const row of handle.data()) {
      map.set(row.emoji, (map.get(row.emoji) ?? 0) + 1);
    }
    return map;
  });

  mine = computed(() => {
    const handle = this.handle;
    if (handle === undefined) return new Set<string>();
    const set = new Set<string>();
    for (const row of handle.data()) {
      if (row.actorId === this.myUserId) set.add(row.emoji);
    }
    return set;
  });

  ngOnInit() {
    // connect() needs the Inputs to be resolved; defer it to ngOnInit.
    this.handle = this.sync.connect<CommentReactionRow>({
      collection: "comment_reactions",
      params: { commentId: this.commentId },
      url: this.wsUrl,
    });
  }

  toggle(emoji: string) {
    void fetch("/sync/comments/toggleReaction", {
      body: JSON.stringify({
        commentId: this.commentId,
        emoji,
        userId: this.myUserId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }
}
