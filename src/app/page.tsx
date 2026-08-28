import { WatchShowcase } from "@/components/collection/WatchShowcase";
import { HeroBand } from "@/components/hero/HeroBand";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { EthosBand } from "@/components/sections/EthosBand";
import { listarDestaques } from "@/lib/db/pecas";

export default async function HomePage() {
  const destaques = await listarDestaques();

  return (
    <>
      <HeroBand />

      <WatchShowcase
        watches={destaques}
        eyebrow="No cofre agora"
        title="O que está disponível."
      />

      <EthosBand />

      <ClosingCta />
    </>
  );
}
