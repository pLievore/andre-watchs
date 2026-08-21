"""
realesrgan_dml.py  —  Real-ESRGAN inference using torch-directml (AMD GPU on Windows).

Usage:
  python scripts/realesrgan_dml.py -i <input_dir> -o <output_dir>
                                    --model_path <path.pth>
                                    [--outscale 4]
                                    [--tile 512] [--tile_pad 32]
                                    [--denoise_strength 0.5]
                                    [--fp32]
                                    [--suffix out]
                                    [--device cpu|dml]
"""

import argparse
import glob
import os
import sys

import cv2
import numpy as np
import torch


def get_device(device_arg: str):
    """Return the best available torch device."""
    if device_arg == "dml":
        try:
            import torch_directml
            dev = torch_directml.device()
            print(f"[device] torch-directml: {dev}", flush=True)
            return dev
        except Exception as e:
            print(f"[device] torch-directml unavailable ({e}), falling back to CPU", flush=True)
    return torch.device("cpu")


def main():
    parser = argparse.ArgumentParser(description="Real-ESRGAN inference (DirectML / CPU)")
    parser.add_argument("-i", "--input",    required=True,  help="Input folder")
    parser.add_argument("-o", "--output",   required=True,  help="Output folder")
    parser.add_argument("--model_path",     required=True,  help="Path to .pth model file")
    parser.add_argument("-n", "--model_name", default="realesr-general-wdn-x4v3")
    parser.add_argument("-s", "--outscale", type=float, default=4.0, help="Output scale")
    parser.add_argument("--denoise_strength", type=float, default=0.5)
    parser.add_argument("-t", "--tile",     type=int,   default=512)
    parser.add_argument("--tile_pad",       type=int,   default=32)
    parser.add_argument("--pre_pad",        type=int,   default=0)
    parser.add_argument("--suffix",         default="out")
    parser.add_argument("--fp32",           action="store_true")
    parser.add_argument("--device",         default="dml", choices=["dml", "cpu"])
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    device = get_device(args.device)

    # ── Load model ────────────────────────────────────────────────────────────
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    from realesrgan.archs.srvgg_arch import SRVGGNetCompact

    # realesr-general-wdn-x4v3 and realesr-general-x4v3 use SRVGGNetCompact
    model = SRVGGNetCompact(
        num_in_ch=3, num_out_ch=3,
        num_feat=64, num_conv=32,
        upscale=4, act_type="prelu",
    )
    dni_weight = None
    if "wdn" in args.model_name and args.denoise_strength != 1.0:
        # Blend wdn (with denoising) and non-wdn model by denoise_strength
        # For simplicity use the single model at full strength
        pass

    upsampler = RealESRGANer(
        scale=4,
        model_path=args.model_path,
        dni_weight=dni_weight,
        model=model,
        tile=args.tile,
        tile_pad=args.tile_pad,
        pre_pad=args.pre_pad,
        half=(not args.fp32),
        device=device,
    )

    # ── Process images ────────────────────────────────────────────────────────
    paths = sorted(
        glob.glob(os.path.join(args.input, "*.png"))
        + glob.glob(os.path.join(args.input, "*.jpg"))
        + glob.glob(os.path.join(args.input, "*.jpeg"))
    )

    if not paths:
        print(f"No images found in {args.input}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {len(paths)} image(s)…", flush=True)

    for i, path in enumerate(paths):
        imgname = os.path.splitext(os.path.basename(path))[0]
        print(f"  [{i+1}/{len(paths)}] {imgname}", end="", flush=True)

        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None:
            print(f" — FAILED to read, skipping", flush=True)
            continue

        try:
            output, _ = upsampler.enhance(img, outscale=args.outscale)
        except RuntimeError as e:
            print(f" — RuntimeError: {e}", file=sys.stderr, flush=True)
            # Try falling back to smaller tile if OOM
            if "out of memory" in str(e).lower() or "memory" in str(e).lower():
                print(f"  Retrying with tile=128…", flush=True)
                upsampler.tile = 128
                try:
                    output, _ = upsampler.enhance(img, outscale=args.outscale)
                except Exception as e2:
                    print(f" — Failed again: {e2}", file=sys.stderr)
                    sys.exit(1)
            else:
                raise

        save_path = os.path.join(args.output, f"{imgname}_{args.suffix}.png")
        cv2.imwrite(save_path, output)
        print(f" → {save_path}", flush=True)

    print("Done.", flush=True)


if __name__ == "__main__":
    main()
