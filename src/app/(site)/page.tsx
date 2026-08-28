import { HeroBand } from "@/components/hero/HeroBand";
import { EthosBand } from "@/components/sections/EthosBand";
import { HouseInvitation } from "@/components/sections/HouseInvitation";

export default function HomePage() {
  return (
    <>
      <HeroBand />

      <EthosBand />

      <HouseInvitation />
    </>
  );
}
