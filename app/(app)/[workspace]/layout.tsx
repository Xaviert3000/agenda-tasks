import { Sidebar } from "@/components/shared/Sidebar";
import { TopbarWrapper } from "@/components/shared/TopbarWrapper";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspace } = await params;

  return (
    <div className="flex h-full">
      <Sidebar workspace={workspace} />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopbarWrapper workspace={workspace} />
        <main id="main-content" className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
