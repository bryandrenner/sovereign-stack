---
updated: 2026-10-13T10:25
targetAudience: Bryan as the operator building sovereign-stack, and LLM agents helping him implement it
---

# Upcoming increments

These increments take `sovereign-stack` from an empty repository to its MVP. Each one is story-sized and ends in a behavior change someone can observe: an operator, a visitor, or a later increment. The steps under each increment are a starting checklist, not a contract.

The [spec](spec.md) explains the design behind every step. This document only orders the work.

## Contents

- [Contents](#contents)
- [The MVP](#the-mvp)
- [Increments](#increments)
  - [Pulumi runs from a fresh clone](#pulumi-runs-from-a-fresh-clone)
  - [The durable resources exist](#the-durable-resources-exist)
  - [The tailnet admits tagged servers](#the-tailnet-admits-tagged-servers)
  - [The operator reaches a fresh server over the tailnet only](#the-operator-reaches-a-fresh-server-over-the-tailnet-only)
  - [The server keeps its identity and data across rebuilds](#the-server-keeps-its-identity-and-data-across-rebuilds)
  - [HTTPS works end to end](#https-works-end-to-end)
  - [whoami runs as an isolated, rootless workload](#whoami-runs-as-an-isolated-rootless-workload)
  - [Dev asks for a password](#dev-asks-for-a-password)
  - [Prod only runs what dev ran](#prod-only-runs-what-dev-ran)
  - [Prod serves whoami publicly](#prod-serves-whoami-publicly)
  - [Re-provisioning is a rehearsed drill](#re-provisioning-is-a-rehearsed-drill)
- [Deferred until after the MVP](#deferred-until-after-the-mvp)

## The MVP

> [!IMPORTANT]
> When an operator (re)provisions dev using `pulumi up`, and then promotes the same commit to prod, then:
>
> - Anyone can access `https://whoami.drenner.me`, which responds with the request's details, headed by the line `Name: sovereign-stack`.
> - `https://whoami.dev.drenner.me` responds the same way, but only after HTTP basic authentication.

"(Re)provisions" covers both the first bring-up and replacing a server later. Either way, the operator runs `pulumi up` on each layer in order and does nothing else by hand beyond the documented bootstrap.

The MVP is a walking skeleton: the thinnest path through every layer of the spec's design, in both environments.

| In the MVP                                                        | Not yet                                             |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `dev` and `prod`, one server each                                 | Staggered FOSS updates and staggered reboot windows |
| Promotion: prod runs only commits that have run on dev            | First-party workloads and their tag-based promotion |
| All four Pulumi layers: `network`, `storage`, `hosts`, `services` | Backups, database dumps, and restore drills         |
| Tailnet-only SSH, with a separate tailnet policy repository       | CI access to the tailnet, and break-glass SSH       |
| Server identities and Caddy certificates that survive rebuilds    | Podman auto-update and health checks                |
| Basic authentication on dev, from platform runtime secrets        | Runtime secrets for individual workloads            |
| One FOSS service, `whoami`, rootless under its own Unix user      | The deploy script and the `drenner.dev` domain      |

`whoami` runs `traefik/whoami` (Apache-2.0) with `--name=sovereign-stack`. It replies with the visitor's request details, and its first line is `Name: sovereign-stack`.

## Increments

The increments are in dependency order. Each one's "Done when" list is its definition of good enough.

Every increment up to [Dev asks for a password](#dev-asks-for-a-password) builds and proves the platform on dev. Prod then arrives by promotion, using the same code. To keep that true, anything that differs between environments lives in stack configuration or is derived from the stack name, never in code branches written for one environment.

### Pulumi runs from a fresh clone

The operator can clone the repository, fill `secrets/` from the password manager, and run Pulumi against state stored in a versioned Scaleway bucket.

**Done when:**

- Running the wrapper (for example, `./pulumi network dev up`) succeeds on an empty `network` program, and the stack's state appears in the bucket.
- Removing a required deploy secret makes the wrapper fail with an error naming the missing key, never its value.
- Committing a fake secret is blocked by the pre-commit hook.

**Steps:**

1. In Scaleway, create the state bucket by hand and enable object versioning. Create an API key scoped to that bucket for Pulumi.
2. Generate the Pulumi state passphrase and the SSH automation key pair. Store them, with the Scaleway key, in the password manager.
3. Scaffold the repository: one `package.json`, TypeScript configuration, and the `layers/network` Pulumi project with an empty program. Add the other layers in the increments that need them.
4. Add `secrets/` to `.gitignore`, and install gitleaks as a pre-commit hook.
5. Write `secrets.schema.ts` with zod, declaring the deploy secrets so far: the passphrase (`PULUMI_CONFIG_PASSPHRASE`) and the state bucket's credentials (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`). Add the matching `secrets.example/dev/deploy.env`.
6. Write the `./pulumi` wrapper. It loads `secrets/<env>/deploy.env` if present without overriding variables already set, validates them against the schema, and runs Pulumi in the right layer and stack.
7. Log in to the state backend with `pulumi login 's3://<bucket>?endpoint=s3.<region>.scw.cloud&region=<region>'`. Pulumi reads the bucket's credentials from the standard AWS variables above. Once it works, record the answer in the spec and remove it from the spec's open questions.
8. Run `up` on the empty `network` dev stack and check the bucket.

### The durable resources exist

Everything on dev that must outlive a server exists and is protected: `whoami.dev.drenner.me` resolves to dev's own public addresses, and a volume waits for the server.

**Done when:**

- `dig +short A whoami.dev.drenner.me` and `dig +short AAAA whoami.dev.drenner.me` return the dev Primary IPs.
- The Hetzner console shows a firewall admitting only TCP 80, TCP and UDP 443, and ICMP, applied to servers labeled `env=dev`.
- The volume exists, formatted as ext4.
- Pulumi refuses to delete the Primary IPs or the volume, because they're protected.

**Steps:**

1. Add a Hetzner project API token and a Cloudflare API token limited to editing DNS in the `drenner.me` zone to the deploy secrets, the schema, and the example file.
2. Add a stack setting for the Hetzner location.
3. In `network`, create one IPv4 and one IPv6 Primary IP in that location, unassigned, with automatic deletion off and `protect: true`.
4. Create the firewall rules, applied by the label selector `env=<stack name>`.
5. Check the zone's existing records, then create the environment's wildcard A and AAAA records, DNS-only (not proxied): `*.dev.drenner.me` for dev, and `*.drenner.me` for prod.
6. Create the `storage` project with one ext4-formatted volume (10 GB, Hetzner's minimum) in the same location, with `protect: true`.
7. Export the Primary IP IDs, the firewall's label, and the volume's ID and device path (its `linuxDevice` output).

### The tailnet admits tagged servers

The tailnet's access policy is code, and it lets the operator's devices SSH into servers tagged `tag:dev` or `tag:prod`.

**Done when:**

- A pull request whose policy breaks a test can't be applied.
- Merging to `main` applies the policy, and the admin console shows it.
- Keys tagged `tag:dev` and `tag:prod` can be created through Tailscale's API.

**Steps:**

1. Create the tailnet policy repository, starting from the policy currently in the admin console so nothing is lost.
2. Define `tag:dev` and `tag:prod` and their owner, and an access rule letting Bryan's devices reach port 22 on both.
3. Add `tests` that check the operator can reach both tags on port 22, and that neither tag can reach the operator's devices.
4. Add Tailscale's GitOps action (`tailscale/gitops-acl-action`): test on pull requests, apply on pushes to `main`. Store its Tailscale credential in the repository's GitHub secrets.

### The operator reaches a fresh server over the tailnet only

`pulumi up` on the `hosts` layer produces a Debian 13 dev server holding the dev Primary IPs and volume, joined to the tailnet with its identity stored on the volume, and with SSH reachable only through the tailnet.

**Done when:**

- `ssh bryan@<tailnet name>` works, and `sudo` needs no password.
- Port 22 on the public IPv4 and IPv6 addresses doesn't answer.
- The volume is mounted at `/mnt/data`, and tailscaled's state lives on it.
- On the server, `podman --version` reports 5.4, `caddy version` reports a current release from Caddy's repository, and `tailscale status` shows the server tagged `tag:dev`.
- A second `pulumi up` changes nothing, and the join key isn't recreated.

**Steps:**

1. Add a Tailscale API credential that can create keys for both tags to the deploy secrets. Create the `hosts` project, reading the `network` and `storage` outputs through stack references.
2. Create a single-use, preauthorized join key tagged `tag:<stack name>`, with a short expiry (about an hour) and `recreateIfInvalid: 'never'`, so Pulumi keeps it after it's used or expires. It's needed only the first time the server joins; afterward the server's identity on the volume takes over.
3. Render cloud-init from a typed template, and unit-test the rendering. It installs Podman with its rootless helpers (`uidmap`, `dbus-user-session`, `passt`), Caddy from Caddy's apt repository, Tailscale from Tailscale's apt repository, `rsync`, and unattended-upgrades. It creates `bryan` with a locked password, both SSH keys, and passwordless `sudo`, and disables password and root login.
4. In cloud-init, write the volume's fstab entry with `write_files`, using `nofail` and a generous `x-systemd.device-timeout` (several minutes), because the volume is attached only after the server exists. Create the mount point empty, owned by root, and read-only.
5. Keep tailscaled's state on the volume, and make tailscaled wait for it with `RequiresMountsFor=`. Check how Debian's tailscaled unit sets its state path before choosing between a bind mount over `/var/lib/tailscale` and a drop-in that points tailscaled at the volume. Create the state directory when the volume is fresh.
6. Run `tailscale up` with the join key from cloud-init. Confirm it succeeds with an already-used key when state already exists on the volume; if it doesn't, skip `tailscale up` when state exists.
7. Register the automation public key as a Hetzner SSH key and pass it to the server. Without one, Hetzner emails a root password; with one, root's key is unusable anyway because root login is disabled.
8. Create the server from the stock Debian 13 image, with the label `env=<stack name>`, both Primary IPs, and a server type from stack configuration (the smallest CX type for now). Attach the volume.
9. Export the server's ID and tailnet name.

### The server keeps its identity and data across rebuilds

Replacing the dev server gives back the same tailnet device, the same addresses, and the same data, with no new join key and nothing to clean up.

**Done when:**

- After `pulumi up --replace <server URN>`, the new server has the same tailnet name (with no `-1` suffix) and tailnet IP, and the admin console shows one device.
- No new join key was created.
- A file written to `/mnt/data` before the rebuild is still there.
- With the volume unmounted, an unprivileged user writing to `/mnt/data` gets "permission denied."

**Steps:**

1. Set `deleteBeforeReplace: true` on the server. The Primary IPs and the volume can belong to only one server at a time, and two servers must never run with the same tailnet identity.
2. Replace the server, and check every item above.
3. Unmount the volume by hand, check that writes fail, and remount it.

> [!WARNING]
> The volume holds the server's tailnet private key. Anyone who gets the volume, or a backup of it, could impersonate the server on the tailnet. If the volume's tailnet state is ever lost, replace the join key (`pulumi up --replace <key URN>`), which also replaces the server.

### HTTPS works end to end

From anywhere on the internet, `https://whoami.dev.drenner.me` answers with a trusted certificate that survives rebuilds. Caddy answers with a placeholder for now; the next increment puts `whoami` behind it.

**Done when:**

- `curl https://whoami.dev.drenner.me`, from a device off the tailnet, prints the placeholder, and the certificate is from Let's Encrypt.
- A second `pulumi up` changes nothing.
- After replacing the server and running `up` on `hosts` and then `services`, the page answers again with the same certificate (the same serial number).

**Steps:**

1. Create the `services` project, reading `network`, `storage`, and `hosts` outputs through stack references.
2. Render the Caddyfile with the global `email` and `storage file_system /mnt/data/caddy` options, and a site block for the environment's `whoami` hostname that uses `respond "sovereign-stack"`. Derive hostnames from the stack name: `<name>.dev.drenner.me` on dev, `<name>.drenner.me` on prod. Unit-test the rendering for both environments.
3. Over SSH as `bryan`, create `/mnt/data/caddy` once, owned by the `caddy` user. Add a `caddy.service` drop-in with `RequiresMountsFor=/mnt/data`, so Caddy waits for the volume.
4. Upload the Caddyfile to a staging directory named after its content hash, using `CopyToRemote`. Install it, validate it with `caddy validate`, and reload Caddy. Include the server's ID in `triggers`, and make any failure fail `pulumi up`.
5. Expect the server to be still booting when Pulumi first connects: raise the connection's dial retries, and run `cloud-init status --wait` before anything else.

> [!NOTE]
> Keeping certificates on the volume is what makes rebuilds safe. Let's Encrypt issues at most 5 certificates for the same set of hostnames in 7 days, and rebuilds that each requested a new one would hit that limit quickly.

### whoami runs as an isolated, rootless workload

The dev page is now served by `traefik/whoami` in a rootless container under its own Unix user, `foss-whoami`, with Caddy forwarding to it.

**Done when:**

- `curl https://whoami.dev.drenner.me` prints the request's details, headed by `Name: sovereign-stack`.
- As `foss-whoami`, `podman ps` shows the container, and `curl http://127.0.0.1:<port>` on the server answers.
- The container's port isn't reachable from outside the server.
- Stopping the container brings it back, and so does rebooting the server.
- A second `pulumi up` changes nothing.

**Steps:**

1. Create `manifest/foss-services.ts` with a typed `whoami` entry: stable ID, port, and `environments: ['dev', 'prod']`. The `services` layer installs only the workloads enabled for its stack's environment.
2. In `lib/`, derive each workload's UID and sub-UID range from its ID. Choose bases that can't collide with `bryan`'s UID or with the sub-UID range `useradd` gave `bryan`. Unit-test that the ranges never overlap and don't move when entries are added.
3. Over SSH as `bryan`, create the user idempotently: a fixed UID, a home directory, an explicitly assigned sub-UID and sub-GID range (and no range chosen by `useradd` itself), lingering, and the automation key in `authorized_keys`.
4. Write `whoami.container` for `docker.io/traefik/whoami` at a pinned release tag, passing `--name=sovereign-stack`, publishing `127.0.0.1:<port>:80`, with `Restart=always`.
5. Over SSH as `foss-whoami`, sync the Quadlet as the spec describes: upload to a hash-named staging directory, `rsync --delete` it into `~/.config/containers/systemd/`, run `systemctl --user daemon-reload`, and restart the service only if its files changed.
6. Generate the Caddy site blocks from the manifest, replacing `respond` with `reverse_proxy 127.0.0.1:<port>`.

### Dev asks for a password

On dev, Caddy asks for a password before forwarding any request to a FOSS service. The password's hash comes from the platform runtime secrets.

**Done when:**

- `curl https://whoami.dev.drenner.me` without credentials gets a `401 Unauthorized`.
- With credentials (`curl -u bryan:<password> …`), it prints the request's details, headed by `Name: sovereign-stack`.
- The hash appears neither in Git nor in plaintext in Pulumi state.

**Steps:**

1. Choose the dev password, store it in the password manager, and hash it with `caddy hash-password`.
2. Add `secrets/dev/platform.env` holding the hash, declared in the schema with a fake value in `secrets.example/dev/platform.env`.
3. In `services`, read the platform runtime secrets and wrap the hash in `pulumi.secret()`. The rendered Caddyfile then contains a secret, so wrap the Caddyfile in `pulumi.secret()` as well.
4. Render a `basic_auth` block for FOSS services when the stack is `dev`, and none on prod. Extend the rendering tests to cover both.
5. Install the Caddyfile readable only by root and the `caddy` group, since it now contains the hash.

### Prod only runs what dev ran

Pulumi refuses to update a prod stack with any commit that hasn't already been applied to the matching dev stack. Moving that commit to prod is the promotion.

**Done when:**

- Running `up` on a prod stack fails with a clear message if the working tree has uncommitted changes, if the commit isn't pushed, or if the same layer's dev stack last ran a different commit.
- Running `up` on the prod `network` stack with a commit that dev's `network` stack already ran succeeds.
- `pulumi preview` on prod is never blocked.

**Steps:**

1. Have the wrapper pass the current commit to Pulumi, marked as dirty when the working tree has uncommitted changes. Each layer exports it as a `deployedCommit` output, through a shared helper in `lib/`.
2. Before `up` on a prod stack, have the wrapper check that the working tree is clean, that the commit exists on the remote, and that `pulumi stack output deployedCommit` on the same layer's dev stack equals the current commit.
3. Add `secrets/prod/deploy.env`, its example, and prod stack settings for `network`: the location.
4. Promote the `network` layer: apply a commit to dev, then the same commit to prod. Check the prod Primary IPs, firewall, and `*.drenner.me` records.

### Prod serves whoami publicly

All four prod stacks run the commit that dev ran, and `https://whoami.drenner.me` answers anyone, with no password. This increment meets the MVP's acceptance check for a first bring-up.

**Done when:**

- `curl https://whoami.drenner.me`, from a device off the tailnet, prints the request's details, headed by `Name: sovereign-stack`, without asking for credentials.
- `tailscale status` shows the prod server tagged `tag:prod`.
- Every prod stack's `deployedCommit` equals its dev stack's.

**Steps:**

1. Add the prod stack settings for `storage`, `hosts`, and `services`. No prod platform secrets are needed yet, because prod has no basic authentication.
2. Promote each layer in order (`storage`, `hosts`, `services`), checking each before the next.
3. Repeat the checks from earlier increments that apply to prod: SSH over the tailnet only, the volume mounted with tailscaled's state on it, and a second `pulumi up` changing nothing.

### Re-provisioning is a rehearsed drill

The operator can rebuild either environment by following a short written procedure, and has proven that it works. This increment completes the MVP's acceptance check.

**Done when:**

- Following the runbook from a fresh clone in a new directory, the operator replaces the dev server, runs `pulumi up` on each dev layer in order, replaces the prod server, and runs the same commit on each prod layer. Both `whoami` pages then answer as the MVP describes, with no other manual steps.
- The drill has succeeded twice in a row.

**Steps:**

1. Write the runbook: the layer order (`network`, `storage`, `hosts`, `services`), promoting a commit from dev to prod, deliberately replacing a server, what to do if a volume's tailnet state is lost, and how to check the result.
2. Run the drill, and fix anything that needed an unwritten step.
3. Run it again, cleanly.
4. Update the readme's status note: both environments are live.

## Deferred until after the MVP

These parts of the spec come later, each in its own increment or epic:

- Staggered FOSS image updates and staggered reboot windows (dev before prod).
- Runtime secrets for individual workloads.
- First-party workloads: the `drenner.dev` wildcard records, the deploy script, environment tags and tag-based promotion, forced-command CI keys, `tag:ci` tailnet access, and the reusable deploy workflow.
- Backups, database dumps, and restore drills. Backups should exclude tailscaled's state on the volume.
- Podman auto-update and health checks.
- Break-glass SSH through the firewall.
- A `user@.service` drop-in with `RequiresMountsFor=/mnt/data`, once a workload stores data on the volume.
- Uptime checks and alerts with Gatus and ntfy.
- Gitleaks as a CI check, in addition to the pre-commit hook.
