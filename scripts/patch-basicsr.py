"""Patch basicsr degradations.py to work with torchvision >= 0.17"""
import pathlib

path = pathlib.Path(
    r"C:\Users\paulo\AppData\Local\Programs\Python\Python311\Lib\site-packages\basicsr\data\degradations.py"
)
txt = path.read_text(encoding="utf-8")

# The PowerShell replace wrote literal backtick-n; fix to real newlines
OLD_LITERAL = "try:`n    from torchvision.transforms.functional_tensor import rgb_to_grayscale`nexcept ImportError:`n    from torchvision.transforms.functional import rgb_to_grayscale"
ORIG = "from torchvision.transforms.functional_tensor import rgb_to_grayscale"
FIXED = (
    "try:\n"
    "    from torchvision.transforms.functional_tensor import rgb_to_grayscale\n"
    "except ImportError:\n"
    "    from torchvision.transforms.functional import rgb_to_grayscale"
)

if OLD_LITERAL in txt:
    txt2 = txt.replace(OLD_LITERAL, FIXED)
    path.write_text(txt2, encoding="utf-8")
    print("Patched (fixed literal backtick-n)")
elif ORIG in txt:
    txt2 = txt.replace(ORIG, FIXED)
    path.write_text(txt2, encoding="utf-8")
    print("Patched (fixed original import)")
else:
    print("Already patched or not found — no change needed")
