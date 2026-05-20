import { Head } from "@absolutejs/absolute/react/components";
import { Chat } from "../components/Chat";

type ReactChatProps = {
  cssPath?: string;
};

export const ReactChat = ({ cssPath }: ReactChatProps) => (
  <html lang="en">
    <Head
      cssPath={cssPath}
      description="AI streaming demo with React, powered by AbsoluteJS."
      title="AbsoluteJS AI Chat - React"
    />
    <body>
      <Chat />
    </body>
  </html>
);
