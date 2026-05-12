#!/usr/bin/env node
/**
 * spectr — Node CLI front-end for the Spectr pipeline.
 *
 * Subcommands:
 *   generate <mp4>       Run the full pipeline against a screen recording.
 *   install-skill        Install the Claude Code skill into ~/.claude/skills/spectr/.
 *
 * The pipeline itself is Python (spectr_mcp/cli.py). This wrapper exists so
 * `npm`/`npx` users get the same UX as Higgsfield and friends without us
 * having to rewrite the worker. It shells out to `uvx` underneath, which
 * resolves the latest Spectr Python package directly from this GitHub repo.
 *
 * Required tools (we detect + surface helpful errors if missing):
 *   - uvx (from astral.sh/uv) — Python package runner.
 *   - ffmpeg — only for the `generate` subcommand (frame extraction).
 *   - claude CLI logged in OR ANTHROPIC_API_KEY in env — for vision + spec gen.
 */

'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');

const REPO = process.env.SPECTR_REPO || 'Meliwat/spectr';
const REF = process.env.SPECTR_REF || 'master';
const UVX_FROM = process.env.SPECTR_UVX_FROM || `git+https://github.com/${REPO}@${REF}`;
const SKILL_URL = `https://raw.githubusercontent.com/${REPO}/${REF}/claude_skill/spectr/SKILL.md`;

function log(msg) {
  process.stderr.write(`spectr: ${msg}\n`);
}

function die(msg, code = 1) {
  process.stderr.write(`spectr: error: ${msg}\n`);
  process.exit(code);
}

function commandExists(cmd) {
  const res = spawnSync('command', ['-v', cmd], { shell: '/bin/sh' });
  return res.status === 0;
}

function checkTool(cmd, installHint) {
  if (!commandExists(cmd)) {
    die(`'${cmd}' not on PATH. ${installHint}`, 127);
  }
}

function usage() {
  process.stdout.write(`spectr — turn a screen recording into a spec.md

Usage:
  spectr generate <recording.mp4> --app <name> [options]
  spectr install-skill
  spectr --help | --version

Subcommands:
  generate         Run the full pipeline (frame extract → vision → 7-section spec).
  install-skill    Install the Claude Code skill at ~/.claude/skills/spectr/SKILL.md.

generate options:
  --app NAME           Name of the app shown in the recording (required).
  --your-app NAME      Name of the clone you're building (default: --app).
  --brand-colors JSON  Brand color overrides, e.g. '{"primary":"#FF5722"}'.
  --max-frames N       Cap frames sent to vision (default: 20).
  -o, --output PATH    Where to write spec.md (default: ./spec.md).

Auth (no spectr-side API key — uses YOUR Claude subscription):
  Default: shells out to the \`claude\` CLI. Run \`claude login\` once.
  Override: set ANTHROPIC_API_KEY in env to use the SDK path instead.

Environment overrides (advanced):
  SPECTR_REPO          GitHub repo (default: Meliwat/spectr)
  SPECTR_REF           Git ref (default: master)
  SPECTR_UVX_FROM      Full --from arg passed to uvx (default: git+https://...)
`);
}

function version() {
  const pkg = require('../package.json');
  process.stdout.write(`spectr ${pkg.version}\n`);
}

async function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'spectr-cli' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlink(dest, () => downloadToFile(res.headers.location, dest).then(resolve, reject));
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => reject(new Error(`HTTP ${res.statusCode} from ${url}`)));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function cmdInstallSkill() {
  const skillDir = path.join(os.homedir(), '.claude', 'skills', 'spectr');
  const skillPath = path.join(skillDir, 'SKILL.md');

  log(`installing skill from ${REPO}@${REF}`);
  await fsp.mkdir(skillDir, { recursive: true });

  try {
    await downloadToFile(SKILL_URL, skillPath);
  } catch (err) {
    die(`failed to download skill: ${err.message}`);
  }

  const stat = await fsp.stat(skillPath);
  if (stat.size === 0) {
    await fsp.unlink(skillPath);
    die(`downloaded file is empty — check ${SKILL_URL}`);
  }

  // Sanity check: skill files start with YAML frontmatter.
  const head = await fsp.readFile(skillPath, { encoding: 'utf8', length: 8 });
  if (!head.startsWith('---')) {
    await fsp.unlink(skillPath);
    die(`downloaded file does not look like a Claude Code skill (missing --- frontmatter)`);
  }

  log(`installed at ${skillPath}`);
  log('drop a .mp4 in any Claude Code conversation and ask Claude to spec it.');
}

function cmdGenerate(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  checkTool('uvx', 'install via: curl -LsSf https://astral.sh/uv/install.sh | sh');

  // Pre-flight ffmpeg check — only matters when a real .mp4 is being passed.
  // The Python side surfaces a clearer error if ffmpeg is missing, so this is
  // a soft check (warn, don't block) for early UX.
  if (!commandExists('ffmpeg')) {
    log('warning: ffmpeg not on PATH. Frame extraction will fail.');
    log('  macOS: brew install ffmpeg');
    log('  Linux: apt install ffmpeg  (or your distro equivalent)');
  }

  // Forward all args verbatim to the Python CLI's `generate` subcommand.
  // We chain through uvx --from <git-ref> which installs + runs in one shot.
  const uvxArgs = ['--from', UVX_FROM, 'spectr-cli', 'generate', ...args];
  log(`running: uvx ${uvxArgs.join(' ')}`);

  const child = spawn('uvx', uvxArgs, { stdio: 'inherit' });
  child.on('error', (err) => die(`failed to spawn uvx: ${err.message}`));
  child.on('close', (code, signal) => {
    if (signal) {
      process.stderr.write(`spectr: killed by signal ${signal}\n`);
      process.exit(128);
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    usage();
    return;
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    version();
    return;
  }

  const sub = argv[0];
  const rest = argv.slice(1);

  switch (sub) {
    case 'generate':
      cmdGenerate(rest);
      break;
    case 'install-skill':
      await cmdInstallSkill();
      break;
    default:
      process.stderr.write(`spectr: unknown subcommand: ${sub}\n\n`);
      usage();
      process.exit(2);
  }
}

main().catch((err) => {
  die(err.message ?? String(err));
});
