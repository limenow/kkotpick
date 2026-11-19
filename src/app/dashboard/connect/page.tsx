import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOwner } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectForm } from "./connect-form";

export default function ConnectPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 pt-8 pb-40">
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-8">
            <span className="sr-only">화면을 불러오고 있어요</span>
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        }
      >
        <Connect />
      </Suspense>
    </main>
  );
}

async function Connect() {
  const { shop } = await getOwner();
  if (shop) redirect("/dashboard");
  return <ConnectForm />;
}
