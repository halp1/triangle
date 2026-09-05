if (process.env.TETO_PREPARE === "1") process.exit(0);

const env = { ...process.env, TETO_PREPARE: "1" };

for (const args of [["install"], ["run", "build"]]) {
  const proc = Bun.spawn(["bun", ...args], {
    cwd: import.meta.dirname + "/..",
    env,
    stdio: ["inherit", "inherit", "inherit"]
  });

  const code = await proc.exited;
  if (code !== 0) process.exit(code);
}
