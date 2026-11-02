"use client";

import { useActionState } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/admin/(console)/categories/actions";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  apiCount: number;
  childCount: number;
};

const initialState: CategoryActionState = { status: "idle", message: "" };
const field = "mt-2 w-full rounded-xl border border-white/10 bg-[#0b1018] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400/60";

function Result({ state }: { state: CategoryActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-xs ${state.status === "error" ? "text-rose-300" : "text-emerald-300"}`}>{state.message}</p>;
}

function CreateCategoryForm() {
  const [state, action, pending] = useActionState(createCategoryAction, initialState);
  return (
    <form action={action} className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
      <h2 className="text-sm font-extrabold text-white">Create category</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-300">Name<input name="name" required minLength={2} maxLength={120} className={field} placeholder="e.g. Developer Tools"/></label>
        <label className="text-xs font-semibold text-slate-300">Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} className={field} placeholder="developer-tools"/></label>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Description<textarea name="description" rows={2} maxLength={2000} className={field} placeholder="What belongs in this category?"/></label>
      </div>
      <button disabled={pending} className="mt-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{pending ? "Creating…" : "Create category"}</button>
      <Result state={state}/>
    </form>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const [updateState, updateAction, updating] = useActionState(updateCategoryAction, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteCategoryAction, initialState);

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usage</p><p className="mt-1 text-sm font-extrabold text-white">{category.apiCount} APIs</p></div>
        <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{category.childCount} children</span>
      </div>
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="id" value={category.id}/>
        <label className="block text-xs font-semibold text-slate-300">Name<input name="name" required defaultValue={category.name} maxLength={120} className={field}/></label>
        <label className="block text-xs font-semibold text-slate-300">Slug<input name="slug" required defaultValue={category.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} className={field}/></label>
        <label className="block text-xs font-semibold text-slate-300">Description<textarea name="description" rows={2} defaultValue={category.description ?? ""} maxLength={2000} className={field}/></label>
        <button disabled={updating} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:opacity-50">{updating ? "Saving…" : "Save changes"}</button>
        <Result state={updateState}/>
      </form>
      <div className="mt-4 border-t border-white/[0.07] pt-4">
        <form action={deleteAction}>
          <input type="hidden" name="id" value={category.id}/>
          <button disabled={deleting || category.apiCount > 0 || category.childCount > 0} className="text-xs font-bold text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30">{deleting ? "Deleting…" : "Delete category"}</button>
          {(category.apiCount > 0 || category.childCount > 0) && <p className="mt-1 text-[11px] text-slate-500">Reassign {category.apiCount} APIs and move {category.childCount} child categories before deleting.</p>}
          <Result state={deleteState}/>
        </form>
      </div>
    </article>
  );
}

export function AdminCategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-5">
      <CreateCategoryForm/>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => <CategoryCard key={category.id} category={category}/>)}
      </div>
      {!categories.length && <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-500">No categories yet. Create the first category above.</p>}
    </div>
  );
}
