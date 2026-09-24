# Contributing

- [Quick Start](#quick-start)
  - [One-Time Workstation Setup](#one-time-workstation-setup)
  - [After Switching to a Branch](#after-switching-to-a-branch)
- [Common Tasks](#common-tasks)
- [Uncommon Tasks](#uncommon-tasks)

## Quick Start

### One-Time Workstation Setup

This repository's dev setup is tuned for macOS, Bash, and Visual Studio Code. It is likely compatible, though less convenient, with other OSes and editors.

1. **Install Node.**

   See [.nvmrc](.nvmrc) for the required Node version.

   It is recommended to install Node through a version manager like [nvm](https://github.com/nvm-sh/nvm).

<!-- TBD include installing other local CLI tools like Pulumi. -->

### After Switching to a Branch

1. **Confirm the correct Node version is active.**

   If using `nvm`:

   ```sh
   nvm use
   ```

2. **Restore dependencies.**

   ```sh
   npm install
   ```

## Common Tasks

**Run quick checks:**

These checks run fast and are suitable to run frequently during development.

```sh
npm test
```

This includes type-checking and linting.

<!-- TBD unit testing, and checking Pulumi via `pulumi preview` -->

**Run all checks:**

These checks are stricter and run more slowly and are suitable to run before pushing.

```sh
npm run test:all
```

This includes type-checking and stricter linting.

<!-- TBD unit testing, integration/E2E testing, and checking Pulumi via `pulumi preview` -->

## Uncommon Tasks

**Upgrade Prettier:**

⚠️ [Prettier's documentation](https://prettier.io/docs/install) warns:

> We change how code is formatted in each release! It’s important to have a locked down version of Prettier in your `package.json`.

It is recommended to upgrade Prettier _and reformats all files_ in a dedicated commit. Otherwise future file changes may result in unrelated formatting changes.

1. Upgrade Prettier.

   ```sh
   npm install --save-dev --save-exact prettier@latest
   ```

2. Reformat all files.

   ```sh
   npx prettier --write .
   ```

   This only occasionally results in changes. Prettier is trustworthy, so those changes are safe.

**Type-check:**

```sh
npx tsc
```

This is performed as a part of `npm test` and `npm run test:all`.

**Lint:**

```sh
npx eslint
```

This is performed as a part of `npm test` and `npm run test:all`.

Strict:

```sh
CI=true npx eslint --max-warnings 0
```

This is performed as a part of `npm run test:all`.

**Check formatting:**

```sh
npx prettier --check .
```

Formatting is performed automatically on commit.
