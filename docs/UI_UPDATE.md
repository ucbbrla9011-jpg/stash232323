# UI Update Build & Deployment (v2.5)

This guide explains how to build a UI update archive, apply it to a running Stash instance, and roll back if needed.

## Build & package the UI update

Use the script below from the repository root:

```bash
scripts/build-ui-update.sh
```

**What it does**

- Builds the UI from `ui/v2.5` using the existing `make ui` tooling.
- Packages the compiled assets from `ui/v2.5/build` into a versioned archive.
- Outputs the archive to a predictable location for operators.

**Output path & naming**

By default, the script creates:

```
dist/ui-updates/stash-ui-v2.5-<timestamp>-<gitsha>.tar.gz
```

You can override the version or output directory:

```bash
UI_UPDATE_VERSION=2024-05-01-rc1 \
UI_UPDATE_OUTPUT_DIR=/tmp/ui-updates \
scripts/build-ui-update.sh
```

## Apply the update (running Stash instance)

Stash embeds the UI assets into the server binary at build time. That means applying an update requires rebuilding and redeploying the Stash binary (or container image) after replacing the UI assets on disk.

### Steps

1. **Stop the Stash service** so no one is using the UI during the update.
2. **Back up the current UI assets** (optional but recommended):

   ```bash
   cp -a ui/v2.5/build ui/v2.5/build.backup.$(date +%Y%m%d%H%M%S)
   ```

3. **Extract the new archive into `ui/v2.5/build`:**

   ```bash
   rm -rf ui/v2.5/build
   mkdir -p ui/v2.5/build
   tar -xzf /path/to/stash-ui-v2.5-<version>.tar.gz -C ui/v2.5/build
   ```

4. **Rebuild and redeploy Stash** so the new UI assets are embedded:

   ```bash
   make stash
   ```

   (If you deploy via Docker or release builds, rebuild your image or release binary the same way you normally do.)

5. **Restart the Stash service** and confirm the UI loads correctly.

## Roll back the update

If you need to revert:

1. **Stop the Stash service.**
2. **Restore the previous UI assets** (from your backup or a prior archive):

   ```bash
   rm -rf ui/v2.5/build
   cp -a ui/v2.5/build.backup.<timestamp> ui/v2.5/build
   # OR
   tar -xzf /path/to/previous/stash-ui-v2.5-<version>.tar.gz -C ui/v2.5/build
   ```

3. **Rebuild and redeploy the Stash binary or image** (same as the apply step).
4. **Restart the Stash service** and verify the UI is back to the previous version.
