import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ModulesSection from "@/components/landing/ModulesSection";
import AdvantagesSection from "@/components/landing/AdvantagesSection";
import PricingSection from "@/components/landing/PricingSection";
import RoadmapSection from "@/components/landing/RoadmapSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ModulesSection />
      <AdvantagesSection />
      <PricingSection />
      <RoadmapSection />
      <FAQSection />
      <Footer />
    </main>
  );
}
