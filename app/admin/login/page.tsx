export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main lang="en" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-4 text-xl font-semibold">KhamarMitra admin</h1>
      <form action="/api/admin/login" method="POST" className="flex flex-col gap-3">
        <label className="text-sm text-neutral-700">
          Password
          <input
            type="password"
            name="password"
            autoFocus
            required
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">Incorrect password.</p>}
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-white">
          Sign in
        </button>
      </form>
    </main>
  );
}
