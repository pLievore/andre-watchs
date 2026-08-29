import { HeroBand } from "@/components/hero/HeroBand";
import { EthosBand } from "@/components/sections/EthosBand";
import { HouseInvitation } from "@/components/sections/HouseInvitation";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { clienteAtual } from "@/lib/db/server";

export default async function HomePage() {
  const [cliente, admin] = await Promise.all([clienteAtual(), usuarioAdmin()]);
  const podeAbrirAcervo = Boolean(admin) || cliente?.status === "ativo";

  return (
    <>
      <HeroBand podeAbrirAcervo={podeAbrirAcervo} />

      <EthosBand />

      <HouseInvitation podeAbrirAcervo={podeAbrirAcervo} />
    </>
  );
}
