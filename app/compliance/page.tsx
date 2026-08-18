export default function Compliance() {
  return (
    <div className="flex-grow pt-8 pb-16 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full">
      <div className="space-y-stack-lg">
        {/* Page Header */}
        <div className="border-b border-surface-variant pb-6">
          <h1 className="text-headline-xl font-headline-xl text-on-surface mb-2">Business Details & Compliance</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant">Verified credentials and operational infrastructure for New Balaji Transports.</p>
        </div>

        {/* Verification Grid */}
        <section className="space-y-6">
          <h2 className="text-headline-md font-headline-md text-on-surface">Compliance & Registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface-container-low rounded-lg text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#E6F4EA] text-[#137333] text-label-sm font-label-sm px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                </span>
              </div>
              <h3 className="text-body-lg font-body-lg font-semibold text-on-surface mb-1">GST Registration</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant font-mono">33AAACH7418G1Z9</p>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface-container-low rounded-lg text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#E6F4EA] text-[#137333] text-label-sm font-label-sm px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                </span>
              </div>
              <h3 className="text-body-lg font-body-lg font-semibold text-on-surface mb-1">Transport Permit</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant font-mono">TN-NP-2023-8921</p>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface-container-low rounded-lg text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#E6F4EA] text-[#137333] text-label-sm font-label-sm px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                </span>
              </div>
              <h3 className="text-body-lg font-body-lg font-semibold text-on-surface mb-1">Govt. License</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant font-mono">GL-TN-45-X-9876</p>
            </div>

            {/* Card 4 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-surface-container-low rounded-lg text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#E6F4EA] text-[#137333] text-label-sm font-label-sm px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                </span>
              </div>
              <h3 className="text-body-lg font-body-lg font-semibold text-on-surface mb-1">Service SLA</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant">Tier 1 Logistics Partner</p>
            </div>
          </div>
        </section>

        {/* Branch Network Section */}
        <section className="space-y-6 pt-8">
          <h2 className="text-headline-md font-headline-md text-on-surface">Branch Network</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {/* Branch 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow flex flex-col">
              <div className="h-48 bg-surface-variant relative">
                <img className="w-full h-full object-cover" alt="Chennai Head Office Map" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbAlh3WQkeiuVnUeGoHCQLvdKKG2AJXBIcUnlKvzaOvanpN3B6Y1uPcM-iCPDbJrP--yFUbqFJ-QGeeJquaxg3Vk4Ljl_nPmfT-ENdhJnFppdYwkKCs3E7FHcLcjFh_bWgu3GGyL6oSn5xZ3Mb8NOSSAo5apJ5I8VV3mP6-cJLfWvzleUEbNQnvxfuJ0kr71yqgq6mnqheHLxgb903xmRQ2vNeJ1IrcNBksneRl7grwu1_uAZkUqPe"/>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mb-2">Chennai Head Office</h3>
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] mt-0.5">location_on</span>
                    <span className="text-body-sm font-body-sm">45 Industrial Estate, Guindy<br/>Chennai, Tamil Nadu 600032</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">phone</span>
                    <span className="text-body-sm font-body-sm">+91 44 2250 1234</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Branch 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow flex flex-col">
              <div className="h-48 bg-surface-variant relative">
                <img className="w-full h-full object-cover" alt="Coimbatore Hub Map" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiFa7N9Q1WP2YLP0MyVHMspntNJbkyz4R6Zu2-EhnrfTvmt3sCpKqtZX-cupoBi54rZPkRmqZ1ovbwgJiaJ1rJkbEke9qWlBghjdHyN8W8lguOtmKyRC8zKZ-SyeAJzK1S4i9mmwL2EueVeMJtb4x1of_CtfvnfLEWARkhrwwT7PnwrftjmXbJ9iU6VUxbaUzG0zfHtiYwkFVr29tRrYfKtxyhrkLxc_q17yOB3VUqS23UzySXt05P"/>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mb-2">Coimbatore Hub</h3>
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] mt-0.5">location_on</span>
                    <span className="text-body-sm font-body-sm">112 Avinashi Road, Peelamedu<br/>Coimbatore, Tamil Nadu 641004</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">phone</span>
                    <span className="text-body-sm font-body-sm">+91 422 4321 876</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Branch 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0px_4px_12px_rgba(11,29,51,0.05)] transition-shadow flex flex-col">
              <div className="h-48 bg-surface-variant relative">
                <img className="w-full h-full object-cover" alt="Madurai Depot Map" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAW20X3wbw4ZYEEvX7B6HfXUTBepulLIwVFxbLKO3qZK1a_PvJ6FYI3jgfh0iBKR50eNXRJa-y0jmikJznrN9XC3OvU9q3hOHDHhCUkdoSMfgGbdNtN4my6611LLXrTFOecMIQOltNUY200Cr4pIYHMz_fHbuY17eUZyjFlNjacR_SSrMwuDEjojRMDXZ1kx5-nNK8UpbyP8_UMu9puo01s6SyshBiAjGQLAfWoyycc5n-UVWAIm4oq"/>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-headline-sm font-headline-sm font-semibold text-on-surface mb-2">Madurai Depot</h3>
                <div className="space-y-3 mb-4 flex-grow">
                  <div className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] mt-0.5">location_on</span>
                    <span className="text-body-sm font-body-sm">78 Bypass Road, Ponmeni<br/>Madurai, Tamil Nadu 625016</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">phone</span>
                    <span className="text-body-sm font-body-sm">+91 452 238 9012</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
