# Sovereign Stack

**Keep the features. Lose the landlord.**

Sovereign Stack is my personal cloud: free and open-source alternatives to services Big Tech would otherwise provide me. It runs on servers I control, and it can move to another hosting provider whenever I choose.

| Instead of                               | Common FOSS alternative:               |
| ---------------------------------------- | -------------------------------------- |
| Google Photos, iCloud Photos             | Immich                                 |
| Google Drive, iCloud Drive, OneDrive     | Syncthing                              |
| Microsoft 365, Google Docs and Sheets    | Nextcloud Office                       |
| ChatGPT, Gemini, Copilot                 | Open WebUI, open-weight models, Ollama |
| Google Password Manager, iCloud Keychain | Vaultwarden                            |
| Google Keep, Apple Notes, OneNote        | Joplin                                 |

## Contents

- [Contents](#contents)
- [About this project](#about-this-project)
- [What it runs](#what-it-runs)
  - [FOSS services](#foss-services)
  - [Apps and experiments](#apps-and-experiments)
- [Why build this](#why-build-this)
- [Principles](#principles)
- [Sovereignty is a spectrum](#sovereignty-is-a-spectrum)
- [How it works, at a glance](#how-it-works-at-a-glance)
- [Documentation](#documentation)

## About this project

Most of my digital life lives on a few companies' platforms. They're convenient, but those companies decide what happens to my data, what it costs, which features survive, and who else gets to see it. Sovereign Stack is my way out, and it runs the software I write on the same foundation.

It's also a craft project. I've built software since 2010, mostly on cloud platforms that someone else operated. Here I run the whole stack myself: Linux servers, rootless containers, infrastructure as code, private networking, TLS, backups, and disaster recovery. I do it the boring, well-documented way, so the skills carry over to future projects.

> [!NOTE]
> **Status: design phase.** Nothing is deployed yet. This readme describes what the platform will be, and [the spec](docs/spec.md) is the detailed plan for building it.

<!-- Maintainer note: update the status note when the first environment is live. -->

## What it runs

The platform hosts three kinds of workloads, each at its own address:

| Kind          | What it is                                                           | Address                                           |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| FOSS services | Open-source alternatives to Big Tech services, mainly for my own use | `<service>.drenner.me`                            |
| Apps          | Software I've written, public for use and demos                      | `<app>.drenner.dev`                               |
| Experiments   | Private software I've written, for trying out ideas                  | `<experiment>.dev.drenner.dev`, behind a password |

When an experiment proves itself, it graduates into an app.

### FOSS services

FOSS services are third-party products like the examples above, defined and configured in this repository. The particular services supported will evolve over time. Adding one is easy.

### Apps and experiments

Apps and experiments are first-party products, implemented and configured in their own repositories. Sovereign Stack owns which apps and experiments it supports, their server-specific wireup, and where to find their repositories. The Sovereign Stack host performs the deployment: It fetches service's version and configuration from its repository and then starts the service. The host also allows an app's or experiment's CI to trigger its own deployment.

## Why build this

- **Own my data.** Photos, videos, files, documents, and AI conversations live on disks I administer. Encrypted backups sit with a different provider, and no third party decrypts traffic along the way.
- **Avoid lock-in.** Open standards and a swappable infrastructure layer mean no single company can change the terms on me.
- **Back open, community-governed software.** I'd rather depend on projects that no one company can take in a new direction.
- **Learn it properly.** I build real operational skills with industry-standard tools, not a pile of one-off hacks.
- **Make it dependable.** Every change lands on dev before prod. Servers are rebuilt from code, and backups are proven with restore drills.

## Principles

- **FOSS first.** Everything that runs on my machines, from servers to laptop tooling to CI steps, has an OSI-approved open-source license. Closed-source hosted services are allowed only as named, temporary exceptions with an open-source exit path.
- **Self-hosted.** Everything runs on infrastructure I administer, with my data under my control.
- **Provider-portable.** The infrastructure layer is swappable by design, so the stack can move between hosting providers. Hetzner is the current target.
- **Independent at runtime.** The deployed stack runs without Big Tech services.
- **Open standards.** Components speak open, documented standards, such as OCI container images, the S3 API, WireGuard, and ACME, so any one of them can be swapped for another implementation.
- **Neutral governance.** I prefer projects governed by foundations or communities over projects controlled by one company. Where I choose a single-vendor tool, I record a neutrally governed alternative.
- **Private by default.** No third party sits in the middle of my traffic, reading what passes through.
- **Vanilla and transferable.** I prefer the boring, widely documented way of doing things. Unusual choices cost debugging time, and standard skills transfer to other work.
- **Rebuildable from code.** Nothing is configured by hand. If a server disappears, code and backups bring everything back.

## Sovereignty is a spectrum

The goal is open source and self-hosted all the way down. Getting there takes time, so a few closed-source hosted services are accepted along the way. Each one is named, justified, and paired with an open-source exit path, and the platform avoids features that would block the move.

| Hosted dependency                                      | Open-source exit path                                        |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| GitHub, for code, CI, and container images             | Forgejo (self-hosted) or Codeberg                            |
| Tailscale's coordination server, for the admin network | Headscale                                                    |
| Cloudflare, for DNS only, never proxied                | deSEC, or self-hosted DNS                                    |
| Scaleway, for object storage and LLM inference         | Any S3-compatible provider or Garage, and self-hosted models |
| Hetzner, for servers                                   | Any VPS provider that supports cloud-init                    |

The spec has [the full list, with reasoning](docs/spec.md#hosted-dependencies-and-exit-paths).

## How it works, at a glance

- **Two environments.** Dev and prod each get their own server. Every change lands on dev first, and prod runs only what has already run on dev.
- **Infrastructure as code.** Four layered Pulumi projects, written in TypeScript, separate things that rarely change (IP addresses, data volumes) from things that often do (services). A server can be destroyed and rebuilt at any time.
- **Isolation.** Every workload runs in rootless Podman containers, managed by systemd, under its own Unix user. A compromised experiment can't reach my photos.
- **Secure access.** Caddy serves everything over HTTPS with automatic certificates. SSH is reachable only over a private Tailscale network, never from the public internet.
- **Simple deployments.** Each app commit builds exactly one image. Git tags record what each environment should run, and a small script on the server makes it so. Deployments work from CI or by hand, with no CI required.
- **Safe data.** Data lives on volumes separate from the servers, with nightly encrypted backups at a different provider.
- **No secrets in any repository,** encrypted or not.
- **Monitoring.** Each environment checks the other's public endpoints and sends alerts to my phone.

**Built with:** Debian, Hetzner Cloud, Pulumi, Podman Quadlets, Caddy, Tailscale, Cloudflare DNS, restic, Scaleway Object Storage, GitHub Actions, Gatus, and ntfy.

## Documentation

- [Spec](docs/spec.md): the architecture, every major decision with its alternatives and trade-offs, and plain-language explainers for each concept.
- [Contributing](CONTRIBUTING.md): how to collaborate on this repository.
