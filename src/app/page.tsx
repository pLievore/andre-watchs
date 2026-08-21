import { WatchShowcase } from "@/components/collection/WatchShowcase";
import { HeroBand } from "@/components/hero/HeroBand";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { EthosBand } from "@/components/sections/EthosBand";

export default function HomePage() {
  return (
    <>
      <HeroBand />

      <WatchShowcase
        eyebrow="No cofre agora"
        title="O que está disponível."
      />

      <EthosBand />

      <ClosingCta />
    </>
  );
}
