import LayoffForm from "@/components/forms/layoff-form";
import { createLayoff } from "@/actions/layoffs";

export default async function NewLayoffPage({
  searchParams,
}: {
  searchParams: Promise<{ companyName?: string; sourceUrl?: string }>;
}) {
  const { companyName, sourceUrl } = await searchParams;

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">New Layoff</h1>
      <LayoffForm
        action={createLayoff}
        defaultCompanyName={companyName}
        defaultSourceUrl={sourceUrl}
      />
    </div>
  );
}
