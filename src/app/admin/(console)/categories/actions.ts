"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export type CategoryActionState = { status: "idle" | "error" | "success"; message: string };

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters.").max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.").max(100),
  description: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(2_000).optional(),
  ),
});

function value(data: FormData, name: string) {
  const item = data.get(name);
  return typeof item === "string" ? item : "";
}

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  revalidatePath("/apis");
}

export async function createCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    name: value(formData, "name"),
    slug: value(formData, "slug"),
    description: value(formData, "description"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check category details." };

  try {
    await getPrisma().category.create({ data: parsed.data });
    revalidateCategories();
    return { status: "success", message: "Category created." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { status: "error", message: "A category with that slug already exists." };
    }
    console.error("Create category failed:", error);
    return { status: "error", message: "The category could not be created." };
  }
}

export async function updateCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const id = value(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Invalid category identifier." };

  const parsed = categorySchema.safeParse({
    name: value(formData, "name"),
    slug: value(formData, "slug"),
    description: value(formData, "description"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check category details." };

  try {
    const result = await getPrisma().category.updateMany({
      where: { id },
      data: parsed.data,
    });
    if (result.count === 0) return { status: "error", message: "Category not found." };
    revalidateCategories();
    return { status: "success", message: "Category updated." };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { status: "error", message: "A category with that slug already exists." };
    }
    console.error("Update category failed:", error);
    return { status: "error", message: "The category could not be updated." };
  }
}

export async function deleteCategoryAction(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const id = value(formData, "id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Invalid category identifier." };

  try {
    await getPrisma().$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id },
        include: {
          _count: { select: { apis: true, children: true } },
        },
      });
      if (!category) throw new Error("Category not found.");
      if (category._count.apis > 0) throw new Error("This category is assigned to APIs. Reassign those APIs before deleting it.");
      if (category._count.children > 0) throw new Error("This category has child categories. Move or delete them first.");
      await tx.category.delete({ where: { id } });
    });
    revalidateCategories();
    return { status: "success", message: "Category deleted." };
  } catch (error) {
    console.error("Delete category failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The category could not be deleted." };
  }
}
