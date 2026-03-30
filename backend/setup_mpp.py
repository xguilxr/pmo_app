"""
Setup mpxj for MS Project (.mpp) file import support.

Usage:
    python setup_mpp.py

Requirements:
    - Python 3.11+
    - Java JDK or JRE 11+ installed (https://adoptium.net/)
"""
import os
import sys
import subprocess
import glob


def find_mpxj_jars():
    """Locate mpxj JARs via pip show (works even without jpype1)."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "show", "mpxj"],
        capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        if line.startswith("Location:"):
            loc = line.split(":", 1)[1].strip()
            mpxj_dir = os.path.join(loc, "mpxj")
            jars = glob.glob(os.path.join(mpxj_dir, "lib", "*.jar"))
            if not jars:
                jars = glob.glob(os.path.join(mpxj_dir, "*.jar"))
            return mpxj_dir, jars
    return None, []


def main():
    # Step 1: Install mpxj Python package (includes all JARs: mpxj + POI + dependencies)
    print("Installing mpxj package (includes all dependency JARs)...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "mpxj", "--no-deps"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"Error installing mpxj: {result.stderr}")
        print("Try manually: pip install mpxj --no-deps")
        sys.exit(1)

    # Verify JARs are present
    mpxj_dir, jars = find_mpxj_jars()
    if jars:
        print(f"Found {len(jars)} JAR files in {mpxj_dir}")
        for j in sorted(jars)[:5]:
            print(f"  - {os.path.basename(j)}")
        if len(jars) > 5:
            print(f"  ... and {len(jars) - 5} more")
    else:
        print("WARNING: mpxj package installed but no JARs found!")
        print("Try: pip install mpxj --no-deps")
        sys.exit(1)

    # Step 2: Compile Java helper
    utils_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "utils")
    java_file = os.path.join(utils_dir, "MppToJson.java")

    if not os.path.exists(java_file):
        print(f"Warning: {java_file} not found")
    else:
        classpath = os.pathsep.join(jars)
        print("\nCompiling MppToJson.java...")
        result = subprocess.run(
            ["javac", "-cp", classpath, java_file],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("MppToJson.java compiled successfully!")
        else:
            print(f"Warning: Could not compile MppToJson.java: {result.stderr}")
            print("It will be compiled automatically on first .mpp import.")

    # Step 3: Verify Java
    print("\nChecking Java...")
    try:
        result = subprocess.run(["java", "-version"], capture_output=True, text=True)
        version_line = result.stderr.split('\n')[0] if result.stderr else "unknown"
        print(f"Java found: {version_line}")
    except FileNotFoundError:
        print("WARNING: Java not found in PATH!")
        print("Install Java JDK 11+ from: https://adoptium.net/")
        print("MS Project import requires Java to run.")

    print("\nSetup complete! You can now import .mpp files.")


if __name__ == "__main__":
    main()
