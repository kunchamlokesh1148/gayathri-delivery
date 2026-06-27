import urllib.request
import zipfile
import io
import os
import shutil

url = "https://nodejs.org/dist/v22.13.1/node-v22.13.1-win-x64.zip"
dest = "d:\\delivery\\node_tmp"

print(f"Downloading Node.js from {url}...")
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
with urllib.request.urlopen(req) as response:
    zip_data = response.read()

print("Extracting Node.js...")
with zipfile.ZipFile(io.BytesIO(zip_data)) as zip_ref:
    zip_ref.extractall(dest)

# Move the contents of node-v22.13.1-win-x64 to d:\delivery\node-bin
src_dir = os.path.join(dest, "node-v22.13.1-win-x64")
target_dir = "d:\\delivery\\node-bin"

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

for item in os.listdir(src_dir):
    s = os.path.join(src_dir, item)
    d = os.path.join(target_dir, item)
    if os.path.exists(d):
        if os.path.isdir(d):
            shutil.rmtree(d)
        else:
            try:
                os.remove(d)
            except Exception as e:
                print(f"Could not remove {d}: {e}")
                continue
    os.rename(s, d)

# Clean up temp dir
shutil.rmtree(dest)

print("Node.js portable installation complete.")
