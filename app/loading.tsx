export default function Loading() {
  return (
    <main className="shell py-8">
      <div className="animate-pulse space-y-10">
        <div className="grid gap-6 lg:grid-cols-[1.02fr,0.98fr]">
          <div className="panel-dark p-8">
            <div className="h-8 w-36 rounded-full bg-white/10" />
            <div className="mt-6 h-16 max-w-xl rounded-[28px] bg-white/10" />
            <div className="mt-4 h-16 max-w-2xl rounded-[28px] bg-white/10" />
            <div className="mt-8 flex gap-3">
              <div className="h-12 w-44 rounded-full bg-white/10" />
              <div className="h-12 w-36 rounded-full bg-white/10" />
            </div>
            <div className="mt-8 h-16 rounded-[24px] bg-white/10" />
          </div>

          <div className="panel p-3">
            <div className="h-[32rem] rounded-[24px] bg-white/80" />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="panel h-48 bg-white/80" />
          <div className="panel h-48 bg-white/80" />
          <div className="panel h-48 bg-white/80" />
          <div className="panel h-48 bg-white/80" />
        </div>

        <div className="panel p-5">
          <div className="h-12 rounded-[20px] bg-white/80" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-[26rem] rounded-[24px] bg-white/80" />
            <div className="h-[26rem] rounded-[24px] bg-white/80" />
            <div className="h-[26rem] rounded-[24px] bg-white/80" />
            <div className="h-[26rem] rounded-[24px] bg-white/80" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="h-[20rem] rounded-[24px] bg-white/80" />
          <div className="h-[20rem] rounded-[24px] bg-white/80" />
          <div className="h-[20rem] rounded-[24px] bg-white/80" />
          <div className="h-[20rem] rounded-[24px] bg-white/80" />
          <div className="h-[20rem] rounded-[24px] bg-white/80" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="panel h-64 bg-white/80" />
          <div className="panel h-64 bg-white/80" />
          <div className="panel h-64 bg-white/80" />
        </div>

        <div className="panel h-[24rem] bg-white/80" />
        <div className="panel-dark h-64" />
      </div>
    </main>
  );
}
