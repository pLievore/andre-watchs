# NEXUS DROP

Boutique digital de sneakers premium da coleção pessoal do fundador.
Fonte da verdade: [SPEC.md](./SPEC.md).

## Setup

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. O hero (`§4`) carrega frames de
`public/hero-sequence/`. Enquanto a pasta estiver vazia o canvas mostra o
skeleton de loading — gere os frames primeiro:

## Pipeline do hero (Veo 3 → 72 frames WebP)

Coloque o `veo3_output.mp4` na raiz do repo e rode um dos pipelines:

**Bash (Git Bash, WSL, macOS, Linux):**
```bash
chmod +x scripts/build-hero-frames.sh
./scripts/build-hero-frames.sh veo3_output.mp4
```

**PowerShell (Windows nativo):**
```powershell
./scripts/build-hero-frames.ps1
```

Saída final: `public/hero-sequence/jordan1-001.webp … jordan1-072.webp`.

Pré-requisitos: `ffmpeg` + `ffprobe` no PATH. No Windows:
```powershell
winget install Gyan.FFmpeg
```
Os scripts usam o encoder `libwebp` embutido no ffmpeg — não precisa instalar
`cwebp` separadamente.

### Por que `fps=9`

Veo 3 entrega 8s @ 24fps = 192 frames. O hero precisa de 72 frames pra
mapear sobre 200vh de scroll (SPEC §4.2). `8s × 9fps = 72`, exato. Os
scripts re-derivam o fps via `ffprobe` antes de extrair, então re-gerar o
vídeo com outra duração não quebra o pipeline.

## Estrutura

```
src/
  app/
    layout.tsx          # root layout + skip link + metadata
    page.tsx            # home — hero + placeholder do carrossel (§5)
    globals.css         # tokens de design (§3.1, §3.4)
  components/
    hero/
      HeroSequence.tsx  # canvas scrubbing + fallbacks (§4)
public/
  hero-sequence/        # frames otimizados (gerados, não commitar)
scripts/
  build-hero-frames.sh  # bash / WSL / Git Bash
  build-hero-frames.ps1 # Windows nativo
```

## Próximos passos

Roadmap em [SPEC.md §13](./SPEC.md). Fase 1 atual: fundação. Próximo:
schema Drizzle + Neon, R2 upload, design system primitives.
