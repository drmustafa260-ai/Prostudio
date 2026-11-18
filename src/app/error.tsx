"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <p className="mb-2 font-bold text-rose-600">حدث خطأ</p>
      <p className="mb-4 text-sm text-slate-600">{error.message}</p>
      <button onClick={reset} className="btn">حاول مرة أخرى</button>
    </div>
  );
}
