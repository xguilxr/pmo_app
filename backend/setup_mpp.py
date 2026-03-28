"""
Download mpxj JAR files for MS Project (.mpp) import support.

Usage:
    python setup_mpp.py

Requirements:
    - Java JDK or JRE installed (https://adoptium.net/)
    - Internet connection (to download mpxj from Maven Central)
"""
import os
import sys
import urllib.request
import zipfile
import tempfile
import shutil

MPXJ_VERSION = "13.4.0"
MAVEN_URL = f"https://repo1.maven.org/maven2/net/sf/mpxj/mpxj/{MPXJ_VERSION}/mpxj-{MPXJ_VERSION}.jar"

LIB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib")


def main():
    os.makedirs(LIB_DIR, exist_ok=True)

    jar_path = os.path.join(LIB_DIR, f"mpxj-{MPXJ_VERSION}.jar")

    if os.path.exists(jar_path):
        print(f"mpxj JAR already exists at {jar_path}")
        print("Delete it and re-run this script to update.")
        return

    print(f"Downloading mpxj {MPXJ_VERSION} from Maven Central...")
    try:
        urllib.request.urlretrieve(MAVEN_URL, jar_path)
        print(f"Downloaded to {jar_path}")
    except Exception as e:
        print(f"Error downloading: {e}")
        print(f"Download manually from: {MAVEN_URL}")
        print(f"Place it in: {LIB_DIR}")
        sys.exit(1)

    # Also try to compile the Java helper
    utils_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "utils")
    java_file = os.path.join(utils_dir, "MppToJson.java")
    if os.path.exists(java_file):
        print("Compiling MppToJson.java...")
        import subprocess
        result = subprocess.run(
            ["javac", "-cp", jar_path, java_file],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("MppToJson.java compiled successfully!")
        else:
            print(f"Warning: Could not compile MppToJson.java: {result.stderr}")
            print("It will be compiled automatically on first .mpp import.")

    print("\nSetup complete! You can now import .mpp files.")
    print("Make sure Java is in your PATH: java -version")


if __name__ == "__main__":
    main()
