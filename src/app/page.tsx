import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ModulesSection from "@/components/landing/ModulesSection";
import AdvantagesSection from "@/components/landing/AdvantagesSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import Footer from "@/components/landing/Footer";
import ContactDialog from "@/components/landing/ContactDialog";
import WhoIsForSection from "@/components/landing/WhoIsForSection";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ModulesSection />
      <AdvantagesSection />
      <WhoIsForSection />
      <PricingSection />
      <FAQSection />
      <Footer />
      <ContactDialog />
    </main>
  );
}
