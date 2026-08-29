export default function PainelLoading() {
  return (
    <div className="w-full flex flex-col gap-8 animate-pulse pt-2">
      {/* Top skeleton header */}
      <div
        className="flex flex-col gap-2.5 border-b pb-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="h-8 w-44 rounded"
          style={{ background: "var(--color-surface-2)" }}
        />
        <div
          className="h-4 w-72 rounded opacity-60"
          style={{ background: "var(--color-surface-2)" }}
        />
      </div>

      {/* Content skeleton cards */}
      <div className="grid gap-3.5">
        <div
          className="h-20 w-full rounded border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        />
        <div
          className="h-20 w-full rounded border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        />
        <div
          className="h-20 w-full rounded border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        />
      </div>
    </div>
  );
}
