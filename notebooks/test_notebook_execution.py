
import os
from pathlib import Path
import nbformat
from nbclient import NotebookClient

project_root = Path.cwd().resolve()
notebook_path = project_root / "notebooks" / "01_data_inspection_cleaned_v2.ipynb"

print("=" * 55)
print("EARTH JUKEBOX - FULL EXECUTION TEST")
print("=" * 55)

print("Project root:", project_root)
print("Notebook:", notebook_path)

nb = nbformat.read(notebook_path, as_version=4)

code_cells = sum(c.cell_type == "code" for c in nb.cells)

print("Total cells:", len(nb.cells))
print("Code cells:", code_cells)

# Notebook paths such as ../data/raw must resolve from notebooks/
os.chdir(notebook_path.parent)

client = NotebookClient(
    nb,
    timeout=300,
    kernel_name="python3",
    allow_errors=False,
    resources={"metadata": {"path": str(notebook_path.parent)}}
)

try:
    client.execute()
    executed = sum(
        c.cell_type == "code" and c.execution_count is not None
        for c in nb.cells
    )

    print("\nEXECUTION: PASSED")
    print(f"Executed: {executed}/{code_cells}")

except Exception as e:
    print("\nEXECUTION: FAILED")
    print(type(e).__name__)
    print(str(e)[:3000])

print("\nOriginal v2 notebook unchanged.")

