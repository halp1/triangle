/**
 * Builds `dist` when the package is installed straight from git.
 *
 * The npm tarball ships `dist` prebuilt, but a git dependency only carries what
 * is committed, so package managers run `prepare` after cloning. Bun hands us a
 * bare checkout with no `node_modules`, so the toolchain has to be installed
 * first. Both steps shell out to `bun`, which re-enters `prepare`, so the guard
 * keeps that from recursing forever.
 */
if (process.env.TETO_PREPARE === "1") process.exit(0);

const env = { ...process.env, TETO_PREPARE: "1" };

for (const args of [["install"], ["run", "build"]]) {
  const proc = Bun.spawn(["bun", ...args], {
    cwd: import.meta.dir + "/..",
    env,
    stdio: ["inherit", "inherit", "inherit"]
  });

  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}
