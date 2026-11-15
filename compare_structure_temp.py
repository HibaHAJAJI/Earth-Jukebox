import json
import subprocess
from pathlib import Path

notebook = Path("notebooks/01_data_inspection_cleaned_v2.ipynb")

with open(notebook, encoding="utf-8") as f:
    current = json.load(f)

git_version = subprocess.check_output(
    ["git", "show", f"HEAD:{notebook.as_posix()}"],
    text=True,
    encoding="utf-8"
)

original = json.loads(git_version)

def show_structure(data, label):
    print("\n" + "=" * 75)
    print(label)
    print("=" * 75)

    for i, cell in enumerate(data["cells"], start=1):
        source = "".join(cell["source"]).strip().split("\n")
        first_line = source[0] if source else "[EMPTY]"

        print(
            f"{i:03} | {cell['cell_type']:8} | "
            f"{first_line[:85]}"
        )

show_structure(original, "GITHUB VERSION")
show_structure(current, "CURRENT V2")
