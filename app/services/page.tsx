import Link from "next/link";

export default function Services() {
  return (
    <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8 pb-stack-lg">
      {/* Header Section */}
      <section className="mb-stack-lg text-center max-w-3xl mx-auto">
        <h1 className="text-headline-lg-mobile md:text-headline-xl font-headline-lg-mobile md:font-headline-xl text-on-surface mb-stack-sm">Our Services</h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant">Delivering robust, end-to-end logistics solutions tailored for heavy transport and commercial freight management.</p>
      </section>

      {/* Detailed Service Sections */}
      <section className="flex flex-col gap-stack-lg mb-stack-lg">
        {/* Service 1: Alternating Left */}
        <div id="lorry-booking" className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center bg-surface-container-lowest border border-surface-variant rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow scroll-mt-24">
          <div className="md:col-span-5 flex justify-center order-2 md:order-1">
            <div className="w-48 h-48 bg-primary-fixed rounded-full flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined" style={{ fontSize: "96px", fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            </div>
          </div>
          <div className="md:col-span-7 order-1 md:order-2">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Interstate Container Transit</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">Reliable movement of commercial load across major routes including MH, MP, UP, Delhi, Punjab, Agra and beyond using 32ft MXL containers built for payload efficiency and secure transit.</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> 32ft MXL container support</li>
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Consistent route planning and dispatch</li>
            </ul>
          </div>
        </div>

        <div id="ftl" className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center bg-surface-container-lowest border border-surface-variant rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="md:col-span-7 order-1">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">FTL and PTL Logistics</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">We handle full truck load and part truck load assignments with flexible load planning for commercial goods, FMCG products, agriculture produce, and industrial consignments.</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Dedicated full-load movement</li>
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Efficient consolidated PTL delivery</li>
            </ul>
          </div>
          <div className="md:col-span-5 flex justify-center order-2">
            <div className="w-48 h-48 bg-primary-fixed rounded-full flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined" style={{ fontSize: "96px", fontVariationSettings: "'FILL' 1" }}>route</span>
            </div>
          </div>
        </div>

        <div id="transit" className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center bg-surface-container-lowest border border-surface-variant rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="md:col-span-5 flex justify-center order-2 md:order-1">
            <div className="w-48 h-48 bg-primary-fixed rounded-full flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined" style={{ fontSize: "96px", fontVariationSettings: "'FILL' 1" }}>agriculture</span>
            </div>
          </div>
          <div className="md:col-span-7 order-1 md:order-2">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Agro, Coir and Product Supply Chain</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">We support agricultural exports and processing supply chains with movement for sabudana, coconuts, pappads, dal, potato, tomato, jackfruits, coir pith blocks, coirs and allied goods.</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Farm-origin and packaged goods</li>
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Coir and agricultural export movement</li>
            </ul>
          </div>
        </div>

        <div id="compliance" className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center bg-surface-container-lowest border border-surface-variant rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="md:col-span-7 order-1">
            <h2 className="text-headline-md font-headline-md text-on-surface mb-4">Heavy-Haul Logistics</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">Our fleet includes 12–16 wheel open body trucks and multi-axle configurations designed for large industrial and infrastructure freight movements with greater payload and route control.</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> 21–35 MT open-body vehicle support</li>
              <li className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Industrial and heavy cargo coordination</li>
            </ul>
          </div>
          <div className="md:col-span-5 flex justify-center order-2">
            <div className="w-48 h-48 bg-primary-fixed rounded-full flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined" style={{ fontSize: "96px", fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mb-stack-lg bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-surface-variant bg-surface-bright">
          <h3 className="text-headline-md font-headline-md text-on-surface">Fleet Capacity Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-label-md font-label-md text-on-surface-variant">
                <th className="p-4 border-b border-surface-variant font-semibold">Truck Type</th>
                <th className="p-4 border-b border-surface-variant font-semibold">Typical Capacity</th>
                <th className="p-4 border-b border-surface-variant font-semibold">Primary Use-Case</th>
                <th className="p-4 border-b border-surface-variant font-semibold">Ideal Cargo Type</th>
              </tr>
            </thead>
            <tbody className="text-body-sm font-body-sm text-on-surface">
              <tr className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-4 border-b border-surface-variant font-medium">10-Wheeler Container Truck</td>
                <td className="p-4 border-b border-surface-variant">15 - 20 Tons</td>
                <td className="p-4 border-b border-surface-variant">Dedicated Container Logistics</td>
                <td className="p-4 border-b border-surface-variant">FMCG, High-Value Palletized Goods, Closed Body Freight</td>
              </tr>
              <tr className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-4 border-b border-surface-variant font-medium">12-Wheeler Open-Body Truck</td>
                <td className="p-4 border-b border-surface-variant">20 - 25 Tons</td>
                <td className="p-4 border-b border-surface-variant">Regional / Inter-state Open Cargo</td>
                <td className="p-4 border-b border-surface-variant">Steel Coils, Cement Bags, Construction Materials</td>
              </tr>
              <tr className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-4 border-b border-surface-variant font-medium">14-Wheeler Open-Body Truck</td>
                <td className="p-4 border-b border-surface-variant">25 - 30 Tons</td>
                <td className="p-4 border-b border-surface-variant">Long-Haul Bulk Material Transit</td>
                <td className="p-4 border-b border-surface-variant">Minerals, Coal, Heavy Industrial Goods</td>
              </tr>
              <tr className="hover:bg-surface-container-lowest transition-colors">
                <td className="p-4 border-b border-surface-variant font-medium">16-Wheeler Open-Body Truck</td>
                <td className="p-4 border-b border-surface-variant">30 - 35 Tons</td>
                <td className="p-4 border-b border-surface-variant">Heavy-Duty Infrastructure Hauling</td>
                <td className="p-4 border-b border-surface-variant">Oversized Machinery, Infrastructure Structures</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-secondary rounded-xl p-8 md:p-12 text-center shadow-md">
        <h3 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-on-secondary mb-4">Ready to ship with us?</h3>
        <p className="text-body-md font-body-md text-secondary-fixed mb-8 max-w-2xl mx-auto">Contact our dispatch team today to get a competitive quote and detailed logistics plan for your next major shipment.</p>
        <Link href="/contact" className="px-8 py-3 bg-surface-container-lowest text-secondary text-label-md font-label-md rounded-lg hover:bg-surface transition-colors shadow-sm inline-flex items-center gap-2 h-12">
          Get a Quote Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </section>
    </div>
  );
}
