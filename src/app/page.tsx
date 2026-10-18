import { HeroSection } from "@/components/home/HeroSection";
import { ToolGrid } from "@/components/home/ToolGrid";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { FAQSection } from "@/components/home/FAQSection";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      <HeroSection />
      <ToolGrid />
      <FeaturesSection />
      <FAQSection />
    </div>
  );
}
