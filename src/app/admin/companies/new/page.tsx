import CompanyForm from "@/components/forms/company-form";
import { getIndustryOptions, createCompany } from "@/actions/companies";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  const industries = await getIndustryOptions();
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">New Company</h1>
      <CompanyForm industries={industries} action={createCompany} defaultName={name} />
    </div>
  );
}
