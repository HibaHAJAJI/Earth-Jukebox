import os
from pathlib import Path
import nbformat
from nbclient import NotebookClient

root = Path.cwd().resolve()
notebook = root / "notebooks" / "01_data_inspection_cleaned_v2.ipynb"

print("=" * 50)
print("EARTH JUKEBOX - EXECUTION TEST")
print("=" * 50)

print("Root:", root)
print("Notebook exists:", notebook.exists())

nb = nbformat.read(notebook, as_version=4)

total = len(nb.cells)
code_count = sum(c.cell_type == "code" for c in nb.cells)

print("Total cells:", total)
print("Code cells:", code_count)

# Set the notebook directory as the kernel working directory
os.chdir(notebook.parent)

client = NotebookClient(
    nb,
    timeout=300,
    kernel_name="python3",
    allow_errors=False,
    resources={"metadata": {"path": str(notebook.parent.resolve())}}
)

try:
    client.execute()

    executed = sum(
        c.cell_type == "code" and c.execution_count is not None
        for c in nb.cells
    )

    print("\nEXECUTION PASSED")
    print(f"Executed: {executed}/{code_count}")

except Exception as error:
    print("\nEXECUTION FAILED")
    print(type(error).__name__)
    print(str(error)[:3000])

print("\nOriginal notebook unchanged.")
