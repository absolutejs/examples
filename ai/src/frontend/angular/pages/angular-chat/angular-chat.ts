import { Component, signal } from "@angular/core";
import { ChatComponent } from "../../components/chat/chat";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [ChatComponent],
  selector: "angular-page",
  standalone: true,
  templateUrl: "./angular-chat.html",
})
export class AngularChatComponent {
  sidebarOpen = signal(false);
}

export const factory = () => AngularChatComponent;
