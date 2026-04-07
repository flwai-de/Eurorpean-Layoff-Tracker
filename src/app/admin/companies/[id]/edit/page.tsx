import { notFound } from "next/navigation";
import CompanyForm from "@/components/forms/company-form";
import { getCompanyById, getIndustryOptions, updateCompany } from "@/actions/companies";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, industries] = await Promise.all([
    getCompanyById(id),
    getIndustryOptions(),
  ]);

  if (!result.success || !result.data) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    return updateCompany(id, formData);
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">Edit: {result.data.name}</h1>
      <CompanyForm industries={industries} company={result.data} action={handleUpdate} />
    </div>
  );
}
