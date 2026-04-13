import React from "react";
import Hero from "../../components/frontend/Hero";
import Brands from "../../components/frontend/Brands";
import TabbedSection from "../../components/frontend/TabbedSection";
import HowItWorks from "../../components/frontend/HowItWorks";
import WhyChoose from "../../components/frontend/WhyChoose";
import Testimonials from "../../components/frontend/Testimonials";
import FAQ from "../../components/frontend/FAQ";
import Newsletter from "../../components/frontend/Newsletter";
import Footer from "../../components/frontend/Footer";

export default function Home() {
  return (
    <section>
      <Hero />
      <Brands />
      <TabbedSection />
      <HowItWorks />
      <WhyChoose />
      <Testimonials />
      <FAQ />
      <Newsletter />
      <Footer />
    </section>
  );
}
