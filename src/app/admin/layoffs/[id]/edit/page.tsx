import { notFound } from "next/navigation";
import LayoffForm from "@/components/forms/layoff-form";
import { getLayoffById, updateLayoff } from "@/actions/layoffs";

export default async function EditLayoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getLayoffById(id);
  if (!result.success || !result.data) notFound();

  const layoff = { ...result.data.layoff, companyName: result.data.companyName };

  async function handleUpdate(formData: FormData) {
    "use server";
    return updateLayoff(id, formData);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Edit Layoff</h1>
      <p className="mb-8 text-sm text-neutral-400">{result.data.companyName} — {result.data.layoff.date}</p>
      <LayoffForm layoff={layoff} action={handleUpdate} />
    </div>
  );
}
