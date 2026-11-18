import { setAppointmentStatus } from "@/lib/actions";

function StatusButton({ id, status, className, children }: {
  id: number; status: string; className: string; children: React.ReactNode;
}) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={className}>{children}</button>
    </form>
  );
}

export function StatusActions({ id, status }: { id: number; status: string }) {
  if (status !== "scheduled") {
    return (
      <StatusButton id={id} status="scheduled" className="text-xs text-slate-500 hover:underline">
        إعادة للجدولة
      </StatusButton>
    );
  }
  return (
    <div className="flex gap-1">
      <StatusButton id={id} status="completed" className="btn-ghost !py-1 text-xs">✓ إتمام</StatusButton>
      <StatusButton id={id} status="cancelled" className="btn-danger !py-1 text-xs">إلغاء</StatusButton>
    </div>
  );
}
