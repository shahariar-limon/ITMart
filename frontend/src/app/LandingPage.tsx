import { Link } from "react-router-dom";

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none">
    <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const categories = [
  { code: "01", name: "Workstations", note: "Built for deep work", accent: "from-cyan-300 to-blue-500" },
  { code: "02", name: "Networking", note: "Stay fast. Stay online.", accent: "from-violet-300 to-indigo-500" },
  { code: "03", name: "Accessories", note: "Upgrade every detail", accent: "from-amber-300 to-orange-500" },
  { code: "04", name: "Components", note: "Power under the hood", accent: "from-emerald-300 to-teal-500" },
];

const products = [
  { tag: "BESTSELLER", name: "ProBook Studio 14", specs: "Core i7 · 16GB · 512GB", price: "$1,249", visual: "laptop" },
  { tag: "NEW", name: "UltraWide Pro 34", specs: "WQHD · 165Hz · USB-C", price: "$699", visual: "monitor" },
  { tag: "TEAM PICK", name: "Mesh Router AX6000", specs: "Wi-Fi 6 · Tri-band · 4 pack", price: "$329", visual: "router" },
];

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#f6f7f4]">
      {/* 1. Hero */}
      <section className="relative isolate border-b border-slate-200/80 px-4 pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="hero-grid absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-bold tracking-wide text-emerald-800 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_#d1fae5]" />
              YOUR COMPLETE IT PARTNER
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-[-.055em] text-slate-950 sm:text-7xl lg:text-[5.5rem]">
              Tech that keeps <span className="text-brand">you moving.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Premium hardware and expert IT support in one dependable place—so you can buy, book, and get back to doing your best work.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="group inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-brand" to="/products">
                Explore products <ArrowIcon />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 font-bold text-slate-900 transition hover:border-brand hover:text-brand" to="/services">
                Book a service
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
              {['Secure checkout', 'Expert support', 'Clear tracking'].map((item) => <span key={item} className="flex items-center gap-1.5"><span className="text-brand"><CheckIcon /></span>{item}</span>)}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="hero-console relative aspect-[4/3] overflow-hidden rounded-[2.25rem] border border-white/80 bg-slate-950 p-5 shadow-2xl shadow-slate-900/25 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 text-white">
                <span className="text-xs font-bold tracking-[.2em]">ITMART / SETUP</span><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold text-emerald-300">SYSTEM READY</span>
              </div>
              <div className="mt-5 grid h-[calc(100%-3.5rem)] grid-cols-[.9fr_1.1fr] gap-4">
                <div className="flex flex-col justify-between rounded-2xl bg-white/[.07] p-4 text-white">
                  <span className="text-xs text-slate-400">Your workspace</span>
                  <div>
                    <div className="mb-4 h-2 w-16 rounded-full bg-emerald-400" />
                    <p className="text-2xl font-black tracking-tight sm:text-3xl">Built to perform.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400"><span>01 / SPEED</span><span>02 / SUPPORT</span></div>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-300 via-cyan-200 to-indigo-300">
                  <div className="absolute left-[18%] top-[18%] h-[56%] w-[68%] rotate-[-4deg] rounded-xl border-[6px] border-slate-900 bg-slate-800 shadow-2xl">
                    <div className="m-2 h-[calc(100%-1rem)] rounded bg-gradient-to-br from-slate-700 to-slate-950 p-3"><div className="h-full rounded border border-white/10 bg-[radial-gradient(circle_at_70%_30%,#34d39955,transparent_45%)]" /></div>
                  </div>
                  <div className="absolute bottom-[13%] left-[12%] h-3 w-[78%] skew-x-[-20deg] rounded bg-slate-950 shadow-xl" />
                  <span className="absolute bottom-3 right-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-900 backdrop-blur">PRO SERIES</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:-left-8"><p className="text-xs font-bold text-slate-400">SUPPORT RESPONSE</p><p className="mt-1 text-2xl font-black text-slate-950">Under 2h</p></div>
          </div>
        </div>
      </section>

      {/* 2. Trust strip */}
      <section aria-label="Store benefits" className="border-b border-slate-200 bg-white px-4 py-7">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[['48h', 'Fast dispatch'], ['100%', 'Verified products'], ['30-day', 'Easy returns'], ['6 days', 'Expert support']].map(([value, label]) => <div key={label}><strong className="block text-2xl font-black text-slate-950">{value}</strong><span className="text-sm text-slate-500">{label}</span></div>)}
        </div>
      </section>

      {/* 3. Categories */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="SHOP BY CATEGORY" title="The right tools, sorted." action="View all products" to="/products" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => <Link to="/products" key={category.name} className="group relative min-h-64 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <span className="text-xs font-black text-slate-400">{category.code}</span>
              <div className={`mx-auto my-8 h-24 w-24 rounded-[2rem] bg-gradient-to-br ${category.accent} opacity-90 shadow-xl transition duration-500 group-hover:rotate-6 group-hover:scale-105`} />
              <h3 className="text-xl font-black text-slate-950">{category.name}</h3><p className="mt-1 text-sm text-slate-500">{category.note}</p>
            </Link>)}
          </div>
        </div>
      </section>

      {/* 4. Featured products */}
      <section className="bg-slate-950 px-4 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading dark eyebrow="CURATED HARDWARE" title="Standout tech. No guesswork." action="Browse the catalog" to="/products" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {products.map((product) => <article key={product.name} className="overflow-hidden rounded-3xl bg-white text-slate-950">
              <div className="product-visual relative flex h-64 items-center justify-center bg-slate-100">
                <span className="absolute left-5 top-5 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black tracking-wider text-white">{product.tag}</span>
                <div className={`device device-${product.visual}`}><div /></div>
              </div>
              <div className="p-6"><p className="text-xs font-semibold text-slate-500">{product.specs}</p><div className="mt-2 flex items-end justify-between gap-3"><h3 className="text-xl font-black">{product.name}</h3><strong className="text-lg">{product.price}</strong></div></div>
            </article>)}
          </div>
        </div>
      </section>

      {/* 5. Services */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div><p className="eyebrow">TECH SUPPORT, SIMPLIFIED</p><h2 className="section-title mt-4">A real expert when tech gets tricky.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Choose a service, request a time, and track the job from your dashboard. No support maze. No mystery status.</p><Link to="/services" className="mt-8 inline-flex items-center gap-2 font-black text-brand">Explore all services <ArrowIcon /></Link></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[['01', 'Device repair', 'Diagnostics and dependable fixes for laptops and desktops.'], ['02', 'Network setup', 'Fast, secure connectivity for home and growing teams.'], ['03', 'Data recovery', 'Careful recovery when important files go missing.'], ['04', 'IT consultation', 'Practical advice for your next technology decision.']].map(([n, title, copy]) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-xs font-black text-brand">SERVICE / {n}</span><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 leading-7 text-slate-500">{copy}</p></article>)}
          </div>
        </div>
      </section>

      {/* 6. Why ITMart */}
      <section className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white sm:p-14 lg:p-16">
          <div className="grid gap-12 lg:grid-cols-2"><div><p className="text-xs font-black tracking-[.2em] text-emerald-100">WHY ITMART</p><h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">One partner.<br />Every tech need.</h2></div><p className="max-w-xl text-lg leading-8 text-emerald-50">We connect quality products with skilled technical service, keeping every order and appointment visible in one secure account.</p></div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-white/20 md:grid-cols-3">{[['01', 'Honest selection', 'Useful technology chosen around real needs.'], ['02', 'Protected purchase', 'Prices and inventory are checked by the server.'], ['03', 'People who help', 'Bookable technicians with clear job tracking.']].map(([n,t,c]) => <div key={t} className="bg-brand p-7"><span className="text-sm text-emerald-200">{n}</span><h3 className="mt-10 text-xl font-black">{t}</h3><p className="mt-2 text-emerald-100">{c}</p></div>)}</div>
        </div>
      </section>

      {/* 7. How it works */}
      <section className="border-y border-slate-200 bg-white px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="eyebrow">HOW IT WORKS</p><h2 className="section-title mt-4">From need to done.</h2></div>
          <div className="relative mt-14 grid gap-8 md:grid-cols-3"><div className="absolute left-[16%] right-[16%] top-7 hidden border-t border-dashed border-slate-300 md:block" />{[['01', 'Discover', 'Search, filter, compare, and find the right fit.'], ['02', 'Buy or book', 'Check out securely or choose a support time.'], ['03', 'Track it', 'Follow your order or service job in one dashboard.']].map(([n,t,c]) => <div key={n} className="relative text-center"><span className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-[#f6f7f4] font-black text-brand">{n}</span><h3 className="mt-6 text-xl font-black">{t}</h3><p className="mx-auto mt-2 max-w-xs text-slate-500">{c}</p></div>)}</div>
        </div>
      </section>

      {/* 8. Business impact */}
      <section className="px-4 py-20 sm:py-28"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-white"><div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" /><p className="text-xs font-bold tracking-[.18em] text-emerald-300">OPERATIONS / LIVE</p><div className="mt-24 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-white/10 p-5"><span className="text-xs text-slate-400">Orders tracked</span><p className="mt-2 text-4xl font-black">100%</p></div><div className="rounded-2xl bg-emerald-400 p-5 text-slate-950"><span className="text-xs font-bold">One workspace</span><p className="mt-2 text-4xl font-black">24/7</p></div><div className="col-span-2 rounded-2xl bg-white p-5 text-slate-950"><div className="flex items-end gap-2">{[35,55,42,75,60,90,82].map((h,i) => <span key={i} style={{height: `${h}px`}} className="flex-1 rounded-t bg-emerald-400" />)}</div></div></div></div>
        <div><p className="eyebrow">BUILT FOR CLARITY</p><h2 className="section-title mt-4">Less chasing. More doing.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Products, service requests, order progress, and notifications come together in one account built around visibility.</p><div className="mt-8 space-y-5">{['See order and booking status at a glance', 'Keep product decisions organized with wishlist and compare', 'Get updates when important progress happens'].map(x => <div key={x} className="flex gap-3 font-bold text-slate-800"><span className="text-brand"><CheckIcon /></span>{x}</div>)}</div></div>
      </div></section>

      {/* 9. Testimonial */}
      <section className="px-4 pb-20 sm:pb-28"><div className="mx-auto max-w-5xl rounded-[2.5rem] border border-slate-200 bg-white px-7 py-14 text-center shadow-sm sm:px-16">
        <div className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-brand">“</div><blockquote className="text-2xl font-bold leading-snug tracking-[-.025em] text-slate-900 sm:text-4xl">Technology should make work feel lighter—not give you another thing to manage.</blockquote><p className="mt-7 text-sm font-bold text-slate-500">THE ITMART PROMISE · PRACTICAL TECH, HUMAN SUPPORT</p>
      </div></section>

      {/* 10. Final CTA */}
      <section className="bg-[#d9f99d] px-4 py-20 sm:py-24"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-black tracking-[.2em] text-emerald-900">READY WHEN YOU ARE</p><h2 className="mt-4 max-w-3xl text-4xl font-black leading-none tracking-[-.05em] text-slate-950 sm:text-6xl">Make your next tech move a smart one.</h2></div><Link to="/register" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-7 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-brand">Create free account <ArrowIcon /></Link></div></section>

      <footer className="bg-slate-950 px-4 py-12 text-slate-400"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row"><div><p className="text-xl font-black text-white">IT<span className="text-emerald-400">MART</span></p><p className="mt-2 text-sm">Products and expert support, together.</p></div><div className="flex flex-wrap gap-6 text-sm font-semibold"><Link to="/products">Products</Link><Link to="/services">Services</Link><Link to="/bundles">Bundles</Link><Link to="/login">Account</Link></div><p className="text-sm">© {new Date().getFullYear()} ITMart</p></div></footer>
    </main>
  );
}

function SectionHeading({ eyebrow, title, action, to, dark = false }: { eyebrow: string; title: string; action: string; to: string; dark?: boolean }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className={dark ? "text-xs font-black tracking-[.2em] text-emerald-300" : "eyebrow"}>{eyebrow}</p><h2 className={`section-title mt-4 ${dark ? 'text-white' : ''}`}>{title}</h2></div><Link className={`inline-flex items-center gap-2 font-black ${dark ? 'text-emerald-300' : 'text-brand'}`} to={to}>{action} <ArrowIcon /></Link></div>;
}
