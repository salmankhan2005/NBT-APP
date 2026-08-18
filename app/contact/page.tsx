import ContactForm from "@/components/ContactForm";

export default function Contact() {
  return (
    <div className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-8 pb-stack-lg flex flex-col gap-stack-lg">
      {/* Hero Section */}
      <section className="text-center py-stack-lg">
        <h1 className="text-headline-xl font-headline-xl text-primary mb-stack-sm">Get in Touch</h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto">
          We are here to assist with all your logistics and transport needs. Reach out to our dedicated team today.
        </p>
      </section>

      {/* Contact Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left: Contact Form */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-surface-variant rounded-xl p-stack-lg shadow-[0px_4px_12px_rgba(11,29,51,0.05)]">
          <h2 className="text-headline-md font-headline-md text-primary mb-stack-md">Send a Message</h2>
          <ContactForm />
        </div>

        {/* Right: Contact Info */}
        <div className="lg:col-span-5 flex flex-col gap-stack-md">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-stack-lg shadow-[0px_4px_12px_rgba(11,29,51,0.05)] flex-grow">
            <h2 className="text-headline-md font-headline-md text-primary mb-stack-md">Direct Contact</h2>
            <div className="flex flex-col gap-stack-md">
              <div className="flex items-start gap-stack-sm p-4 rounded-lg bg-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-secondary text-[28px]">phone_in_talk</span>
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface">Phone Support</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant mt-1">+91 97892 71721</p>
                  <p className="text-label-sm font-label-sm text-outline mt-1">Mon-Sat, 9AM-8PM</p>
                </div>
              </div>
              <div className="flex items-start gap-stack-sm p-4 rounded-lg bg-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-secondary text-[28px]">mail</span>
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface">Email Inquiries</h3>
                  <p className="text-body-md font-body-md text-on-surface-variant mt-1">newbalajitransports1@gmail.com</p>
                  <p className="text-label-sm font-label-sm text-outline mt-1">24/7 Monitoring</p>
                </div>
              </div>
            </div>

            <div className="mt-stack-lg pt-stack-md border-t border-surface-variant">
              <a href="https://wa.me/919789271721" target="_blank" rel="noopener noreferrer" className="w-full h-12 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-lg text-label-md font-label-md hover:bg-[#20bd5a] transition-all shadow-[0px_4px_12px_rgba(11,29,51,0.05)]">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path>
                </svg>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="mt-stack-lg">
        <h2 className="text-headline-md font-headline-md text-primary mb-stack-md text-center">Our Branches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          {/* Branch Card 1 */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-[0px_4px_12px_rgba(11,29,51,0.05)] hover:shadow-[0px_12px_32px_rgba(11,29,51,0.12)] transition-shadow">
            <div className="h-48 bg-surface-container w-full relative">
              <img className="w-full h-full object-cover" alt="Chennai Hub Map" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFGkymd1m1sjlDanwq_aYz2f54fMSdPNsDMdyyCVLafrrkdjpfhP6jF-M6ds0cA4gFThXZUBmLH0IxPQg47L2aLiNQ3mFma27IIimgq6fRG8r012U_huY7kOjjAStETkvq2DWeh1zZjZH3J56nSjb38E7zihp12rqSWh-Ax7xc7ikRqy17yi1L83VIqTJp2mIz2ohSC8G0vt1uTJyNC2MGwT3vzdCfr9IESkg2VQp1-W0u-XUlVeQI"/>
            </div>
            <div className="p-stack-md flex flex-col gap-stack-sm">
              <h3 className="text-headline-md font-headline-md text-on-surface">Chennai Head Office</h3>
              <div className="flex items-start gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-secondary">location_on</span>
                <p className="text-body-sm font-body-sm">45 Logistics Hub Phase 1,<br/>Guindy Industrial Estate,<br/>Chennai, TN 600032</p>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-secondary">call</span>
                <p className="text-body-sm font-body-sm">+91 44 2233 4455</p>
              </div>
            </div>
          </div>

          {/* Branch Card 2 */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-[0px_4px_12px_rgba(11,29,51,0.05)] hover:shadow-[0px_12px_32px_rgba(11,29,51,0.12)] transition-shadow">
            <div className="h-48 bg-surface-container w-full relative">
              <img className="w-full h-full object-cover" alt="Bangalore Hub Map" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3x43rnOu2qBhItIfP4vd5Gv3nL1sx5km1oNtYy77dHCSVqurOoDXRtWciccj4mwsu__jNcxTH4D5mJSehmk1q6Vao-fD-tLMhUqAIOT6Mz-eK-GS0GC94AiVde-OyOC1zbubLxyHpqZjn2mkGqKN0HAiQlzf8zWwZSNH-SzNwKoEPEql9QR5gHi83lT0OvNvwXTHfP1OA0RYUBrVQsASeMK00Hx6e_z-Os2nlk3SD18N5FOSpZdBy"/>
            </div>
            <div className="p-stack-md flex flex-col gap-stack-sm">
              <h3 className="text-headline-md font-headline-md text-on-surface">Bangalore Hub</h3>
              <div className="flex items-start gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-secondary">location_on</span>
                <p className="text-body-sm font-body-sm">Plot 12, Peenya 2nd Stage,<br/>Industrial Area,<br/>Bangalore, KA 560058</p>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-secondary">call</span>
                <p className="text-body-sm font-body-sm">+91 80 4455 6677</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
