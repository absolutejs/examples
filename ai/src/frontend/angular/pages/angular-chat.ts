import { Component, signal } from "@angular/core";
import { ChatComponent } from "../components/chat.component";

@Component({
  imports: [ChatComponent],
  selector: "angular-page",
  standalone: true,
  template: `
    <header>
      <div class="header-left">
        <button
          class="sidebar-toggle"
          (click)="sidebarOpen.set(!sidebarOpen())"
          [title]="sidebarOpen() ? 'Close sidebar' : 'Open sidebar'"
          type="button"
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <rect height="18" rx="2" width="18" x="3" y="3" />
            <line x1="9" x2="9" y1="3" y2="21" />
          </svg>
        </button>
        <a class="logo" href="/">
          <img
            alt="AbsoluteJS"
            height="24"
            src="/assets/png/absolutejs-temp.png"
          />
          AbsoluteJS
        </a>
      </div>
      <nav>
        <a href="/">React</a>
        <a href="/svelte">Svelte</a>
        <a href="/vue">Vue</a>
        <a href="/angular" class="active">Angular</a>
        <a href="/html">HTML</a>
        <a href="/htmx">HTMX</a>
      </nav>
    </header>
    <app-chat
      [sidebarOpen]="sidebarOpen()"
      (sidebarToggle)="sidebarOpen.set(!sidebarOpen())"
    />
  `,
})
export class AngularChatComponent {
  sidebarOpen = signal(false);
}

export const factory = () => AngularChatComponent;
