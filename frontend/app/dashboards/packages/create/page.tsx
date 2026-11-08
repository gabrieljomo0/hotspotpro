"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { PackageForm } from "@/components/dashboard/packages/PackageForm";
import { PACKAGE_TEMPLATES } from "@/components/dashboard/packages/packageTemplates";
import type { PackageInput } from "@/components/dashboard/shared/types";

function CreatePackageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addPackage, routers, businessLocations } = useDashboard();

  const templateKey = searchParams.get("template");
  const initialValues: Partial<PackageInput> | undefined = templateKey
    ? PACKAGE_TEMPLATES.find((t) => t.key === templateKey)?.input
    : undefined;

  function handleSubmit(input: PackageInput) {
    addPackage(input);
    router.push("/dashboards/packages");
  }

  function handleSubmitAndCreateAnother(input: PackageInput) {
    addPackage(input);
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[#a3a3a3]">
        <Link href="/dashboards/packages" className="hover:text-[#1a1a1a]">
          Packages
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#525252]">Create</span>
      </div>

      <h1 className="mb-6 text-3xl font-black text-[#1a1a1a] md:text-4xl">
        Create Package
      </h1>

      <PackageForm
        initialValues={initialValues}
        submitLabel="Create"
        onSubmit={handleSubmit}
        onSubmitAndCreateAnother={handleSubmitAndCreateAnother}
        routers={routers}
        businessLocations={businessLocations}
      />

      <div className="mt-4">
        <Link
          href="/dashboards/packages"
          className="text-sm font-semibold text-[#737373] hover:text-[#525252]"
        >
          Cancel
        </Link>
      </div>
    </section>
  );
}

export default function CreatePackagePage() {
  return (
    <Suspense fallback={null}>
      <CreatePackageForm />
    </Suspense>
  );
}
