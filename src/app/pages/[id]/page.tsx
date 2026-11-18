"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useBrain, withBrain } from "@/lib/store/provider";
import { PageEditor } from "@/components/pages/page-editor";
import { EmptyState } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";

function PageRoute() {
  const { id } = useParams<{ id: string }>();
  const { data, actions } = useBrain();
  const page = data.pages.find((p) => p.id === id);
  if (!page) {
    return (
      <EmptyState
        className="mt-12"
        icon={<FileQuestion className="size-6" />}
        title="This page doesn't exist"
        description="It may have been deleted."
        action={
          <Link href="/pages">
            <Button>Back to pages</Button>
          </Link>
        }
      />
    );
  }
  if (page.archived) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/[0.06] px-5 py-3 text-sm text-gold-soft">
          This page is archived.
          <Button size="sm" variant="primary" onClick={() => actions.setArchived("page", page.id, false)}>
            Restore
          </Button>
        </div>
        <PageEditor key={page.id} page={page} />
      </div>
    );
  }
  return <PageEditor key={page.id} page={page} />;
}

export default withBrain(PageRoute);
