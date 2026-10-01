"""Deploy the app to GitHub Pages (https://anomaly-gg.github.io/workout/).

    python _dev/deploy.py "what changed"

1. runs the planner tests (aborts on failure)
2. stamps sw.js with the app's file list + a content hash, so phones pick up the new version atomically
3. commits everything and pushes to main (Pages serves main /)
"""
import hashlib, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def app_files():
    out = ["index.html", "manifest.webmanifest"]
    for d in ("css", "js", "fonts", "icons"):
        for base, _, names in os.walk(d):
            out += [os.path.join(base, n).replace("\\", "/") for n in sorted(names) if not n.endswith(".txt")]
    return sorted(out)

def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else "Deploy"
    if subprocess.run(["node", "_dev/test_planner.js"]).returncode:
        sys.exit("Tests failed - not deploying.")

    files = app_files()
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode()); h.update(open(f, "rb").read())
    version = "v-" + h.hexdigest()[:12]

    sw = open("sw.js", encoding="utf-8").read()
    sw = re.sub(r'^const VERSION = .*;$', 'const VERSION = "%s";' % version, sw, flags=re.M)
    sw = re.sub(r'^const FILES = .*;$', "const FILES = %s;" % str(["./"] + files).replace("'", '"'), sw, flags=re.M)
    open("sw.js", "w", encoding="utf-8", newline="\n").write(sw)
    print("sw.js ->", version, "(%d files)" % len(files))

    subprocess.run(["git", "add", "-A"], check=True)
    if subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
        print("Nothing to commit.")
    else:
        body = msg + "\n\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
        subprocess.run(["git", "commit", "-q", "-m", body], check=True)
    subprocess.run(["git", "push", "-q", "origin", "main"], check=True)
    print("Pushed. Live in ~1 minute at https://anomaly-gg.github.io/workout/")

if __name__ == "__main__":
    main()
