export default function AboutUs() {
  return (
    <div className="w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto pt-8 pb-stack-lg flex flex-col gap-stack-lg flex-grow">
      <section className="text-center py-stack-lg md:py-16 bg-surface-container-lowest rounded-xl shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center w-full h-full opacity-10"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA8swsQbMXJbwOUE7EwMG50CT0xtvvWtDnSWvJJkpjJrF_pIuKqhtrHwNarpoLEQVk9ffSbqh-8jPjMNkSh_IZZUdVEurHUl3h3tskn6LyFUXVK1VOQeit3Z1EA7YBtDdjTKTLmurIsWRpCY4z2zzLFzHaAUmgaC8vpfPCYdHgbitAMoPwSu2reEGNiaLnIVHprV_K9ajmILmBgHMB9okLlSUo1O6db-GvGXGFPO_9kWFccgNU19KmR')" }}
        ></div>
        <div className="relative z-10 px-gutter">
          <h1 className="text-headline-xl font-headline-xl text-on-surface mb-stack-md md:mb-stack-sm">About New Balaji Transports</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-3xl mx-auto">
            Founded in 2010, New Balaji Transports is an asset-based logistics company specializing in interstate container movement, full truck load freight, part truck load operations, and heavy-haul transportation across India.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl p-gutter shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high hover:shadow-[0px_12px_32px_rgba(11,29,51,0.12)] transition-shadow">
          <div className="w-12 h-12 bg-primary-container text-primary-fixed rounded-lg flex items-center justify-center mb-stack-md">
            <span className="material-symbols-outlined text-headline-md">local_shipping</span>
          </div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-stack-sm">Core Logistics Focus</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mb-stack-md">
            Our regular movements connect Maharashtra, Madhya Pradesh, Uttar Pradesh, Delhi, Punjab, Agra and other major freight corridors with dependable delivery scheduling and responsive dispatch coordination.
          </p>
          <ul className="flex flex-col gap-stack-sm text-body-sm font-body-sm text-on-surface-variant">
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-label-md">check_circle</span> Interstate container transit</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-label-md">check_circle</span> Full truck load and part truck load</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-label-md">check_circle</span> Heavy-haul logistics support</li>
          </ul>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-gutter shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high hover:shadow-[0px_12px_32px_rgba(11,29,51,0.12)] transition-shadow">
          <div className="w-12 h-12 bg-tertiary-container text-tertiary-fixed rounded-lg flex items-center justify-center mb-stack-md">
            <span className="material-symbols-outlined text-headline-md">warehouse</span>
          </div>
          <h2 className="text-headline-md font-headline-md text-on-surface mb-stack-sm">Cargo and Industry Coverage</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mb-stack-md">
            We support the movement of sabudana, coconuts, pappads, dal, potato, tomato, jackfruits, coir pith blocks, coirs, commercial goods, FMCG products and other time-sensitive consignments.
          </p>
          <ul className="flex flex-col gap-stack-sm text-body-sm font-body-sm text-on-surface-variant">
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-label-md">check_circle</span> Agro and coir export industries</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-label-md">check_circle</span> Manufacturing and industrial sectors</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-tertiary-fixed-dim text-label-md">check_circle</span> Commercial supply chains and FMCG logistics</li>
          </ul>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-surface-container-high p-gutter shadow-[0px_4px_12px_rgba(11,29,51,0.05)]">
        <h2 className="text-headline-lg font-headline-lg text-on-surface mb-4">Founder and Legacy</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-gutter items-start">
          <div className="space-y-4 text-body-md font-body-md text-on-surface-variant">
            <p>
              Founded in 2010 by S. Ravikumar, New Balaji Transports is built on a foundation of perseverance, deep-rooted industry experience, and relentless hard work. Before establishing the company, the journey began from the ground up—handling small jobs and navigating every challenge along the way to build a trusted name in heavy-haul logistics.
            </p>
            <p>
              Headquartered in Salem, the company’s leadership is now moving confidently into the next chapter with Arunkumar R stepping in to drive operations forward, expand the fleet, and uphold the family’s commitment to reliable highway transit and client satisfaction.
            </p>
          </div>
          <div className="bg-primary rounded-xl p-5 border border-primary/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <p className="text-label-md font-label-md uppercase tracking-[0.18em] text-white/70 mb-2 mix-blend-multiply">Legacy</p>
              <p className="text-headline-md font-headline-md text-white/80 mix-blend-lighten">Built on trust, discipline and highway reliability.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-stack-lg">
        <h2 className="text-headline-lg font-headline-lg text-on-surface mb-gutter text-center">Operational Scale</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high flex flex-col items-center text-center hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-headline-xl text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>rv_hookup</span>
            <span className="text-headline-md font-headline-md text-on-surface">32ft</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mt-1">MXL Containers</span>
          </div>
          <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high flex flex-col items-center text-center hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-headline-xl text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>weight</span>
            <span className="text-headline-md font-headline-md text-on-surface">17 MT</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mt-1">Payload Capacity</span>
          </div>
          <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high flex flex-col items-center text-center hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-headline-xl text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            <span className="text-headline-md font-headline-md text-on-surface">12–16</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mt-1">Wheel Fleet</span>
          </div>
          <div className="bg-surface-container-lowest p-gutter rounded-xl shadow-[0px_4px_12px_rgba(11,29,51,0.05)] border border-surface-container-high flex flex-col items-center text-center hover:bg-surface-bright transition-colors">
            <span className="material-symbols-outlined text-headline-xl text-secondary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
            <span className="text-headline-md font-headline-md text-on-surface">MH</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mt-1">Core Corridors</span>
          </div>
        </div>
      </section>
    </div>
  );
}
