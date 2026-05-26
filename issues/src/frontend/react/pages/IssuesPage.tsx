import { Head } from "@absolutejs/absolute/react/components";
import { IssuesContent } from "../components/IssuesContent";

type IssuesPageProps = {
  cssPath?: string;
};

export const IssuesPage = ({ cssPath }: IssuesPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="Issues — @absolutejs/sync flagship" />
    <body>
      <IssuesContent />
    </body>
  </html>
);
