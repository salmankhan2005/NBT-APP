// Server Component — no "use client" directive
import VideoIntro from "@/components/VideoIntro";
import HeroSection from "@/components/HeroSection";
import AnimatedStats from "@/components/AnimatedStats";
import IndustriesSection from "@/components/IndustriesSection";
import AnimatedFeatures from "@/components/AnimatedFeatures";
import MilestonesCarousel from "@/components/MilestonesCarousel";
import QuoteSectionClient from "@/components/QuoteSectionClient";

export default function Home() {
  return (
    <>
      {/* ── Cinematic Video Intro (100vh) ── */}
      <section id="section-intro">
        <VideoIntro />
      </section>

      {/* ── Main Page Content ── */}
      <div id="main-content">

        <section id="section-hero">
          <HeroSection />
        </section>

        <section id="section-stats">
          <AnimatedStats />
        </section>

        <section id="section-industries">
          <IndustriesSection />
        </section>

        <section id="section-services" className="py-24 bg-surface">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="mb-12">
              <h2 className="text-headline-lg font-headline-lg text-on-surface">What We Offer</h2>
              <p className="text-body-md font-body-md text-on-surface-variant mt-2 max-w-2xl">
                End-to-end logistics solutions tailored for high-volume B2B operations.
              </p>
            </div>
            <AnimatedFeatures />
          </div>
        </section>

        <section id="section-milestones">
          <MilestonesCarousel />
        </section>

        <section
          id="quote"
          className="py-24 bg-surface-bright border-y border-surface-container scroll-mt-16 overflow-hidden"
        >
          <QuoteSectionClient />
        </section>

      </div>
    </>
  );
}
