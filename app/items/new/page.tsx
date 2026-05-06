"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createItemAction } from "@/app/actions";
import { CATEGORY_LABELS, CATEGORIES } from "@/lib/database.types";

export default function NewItemPage() {
  const [state, formAction, pending] = useActionState(createItemAction, {});

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold tracking-tight text-black mb-6">
          Create new item
        </h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder="Mi nuevo prompt..."
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue="template"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Creating..." : "Create and edit"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-black">Cancel</Link>
        </p>
      </div>
    </div>
  );
}