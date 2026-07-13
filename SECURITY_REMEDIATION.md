# Security Remediation Runbook — Git History Cleanup (DEFERRED)

> **Status: NOT YET EXECUTED.** This is a documented, deferred procedure. The
> working tree is already free of the exposed values (they were removed in the
> `chore(security)` commit). This runbook removes them from **historical**
> commits, which a working-tree cleanup does not touch.
>
> **This document intentionally contains no plaintext secret values.** When you
> execute the procedure, the real literal values go only into a temporary file
> created **outside** the repository and are never committed.

---

## 1. Why this is still needed

Removing a secret from the current files does **not** remove it from Git
history. Older commits still contain the original content, and anyone with the
repository (or a fork/clone) can read it. Three values were previously committed
and pushed and must be treated as exposed:

| Reference name (used throughout this doc) | Replace with |
| --- | --- |
| **previously exposed seed password** | `REDACTED` |
| **previous personal login email** | `admin@example.com` |
| **previous local filesystem path** | `/Users/developer` |

A later README edit made directly on GitHub also introduced an **example
password** and a **secondary contact email** into history. These are optional to
scrub (the example password is not a real credential); if you choose to, add
them to the same replacement file using the same generic approach — do not paste
real values into this document.

> **Mandatory regardless of history rewriting:** the *previously exposed seed
> password* must be considered permanently compromised and **rotated** (see
> §9). History removal is not a substitute for rotation, because forks, clones,
> and provider caches may retain the old content.

---

## 2. Preconditions

- A single active branch (`main`) now contains all work; no separate safety
  branch is required for the rewrite.
- Clean working tree (`git status` shows nothing to commit).
- `git-filter-repo` installed:
  ```bash
  brew install git-filter-repo      # or: pip3 install git-filter-repo
  git filter-repo --version
  ```
- You can force-push to `origin` (adjust branch protection if needed — §6).

---

## 3. Back up first (irreversible operation)

```bash
git remote get-url origin | tee ../ORIGIN_URL.txt
git rev-parse HEAD        | tee ../HEAD_SHA.txt
git bundle create ../PrinodiaCyberLab-backup-$(date +%Y%m%d-%H%M).bundle --all
git clone --mirror "$(git remote get-url origin)" ../PrinodiaCyberLab-remote-backup.git
```
Keep both backups until the rewrite is verified **and** credentials are rotated.

---

## 4. Create the replacement file (OUTSIDE the repo, never committed)

Create `../replacements.txt` with **shell history paused** so the real values do
not land in your shell history. Replace each left-hand placeholder below with the
actual literal value at execution time:

```bash
set +o history
cat > ../replacements.txt <<'EOF'
<PREVIOUSLY_EXPOSED_SEED_PASSWORD>==>REDACTED
<PREVIOUS_PERSONAL_LOGIN_EMAIL>==>admin@example.com
<PREVIOUS_LOCAL_FILESYSTEM_PATH>==>/Users/developer
EOF
set -o history
```

Notes:
- Prefer creating this file in an editor (nano/vim) rather than a here-doc if you
  want to avoid any chance of the values touching shell history.
- `git-filter-repo` matches these as **literal** strings across all blobs in all
  reachable commits (including files that were later deleted or renamed).
- The file lives **outside** the repository so it is never tracked. Delete it
  after verification (§10): `shred -u ../replacements.txt` (or `rm -f`).

---

## 5. Run the rewrite

```bash
git filter-repo --replace-text ../replacements.txt --force
```

`--force` is required because this is not a fresh clone; your §3 backups cover the
risk. `git-filter-repo` will rewrite every reachable commit and then **remove the
`origin` remote** as a safety measure.

### 5a. Optional — scrub the personal email from commit *author metadata*

The content replacement above fixes file **contents** only; it does not change
the author email recorded in commit metadata. If you want that scrubbed too, run
the rewrite with a mailmap that maps the old author identity to your GitHub
privacy noreply address (which is safe to publish — GitHub already exposes it on
every commit):

`../mailmap.txt` (outside the repo):
```
PrinceN09 <144946464+PrinceN09@users.noreply.github.com> <PREVIOUS_PERSONAL_LOGIN_EMAIL>
```
Then:
```bash
git filter-repo --replace-text ../replacements.txt --mailmap ../mailmap.txt --force
```
Author-metadata rewriting changes every commit's identity; it is optional and can
be done later. The confirmed noreply address for this account is
`144946464+PrinceN09@users.noreply.github.com`.

---

## 6. Verify (before pushing)

All of these must return **nothing** (use the generic values you know locally):

```bash
git log -S"<previously exposed seed password>"  --all --oneline
git log -S"<previous personal login email>"     --all --oneline
git log -S"<previous local filesystem path>"    --all --oneline

git grep -n -F "<previously exposed seed password>"  $(git rev-list --all) || echo "clean: password"
git grep -n -F "<previous personal login email>"     $(git rev-list --all) || echo "clean: email"
git grep -n -F "<previous local filesystem path>"    $(git rev-list --all) || echo "clean: path"

git remote -v        # expect empty — filter-repo removed origin
git log --oneline --decorate -8 main
```

---

## 7. Re-add origin and push (force-with-lease only)

```bash
git remote add origin "$(cat ../ORIGIN_URL.txt)"
git fetch origin
git push --force-with-lease --all  origin
git push --force-with-lease --tags origin
```

Use `--force-with-lease` (never plain `--force`): it refuses to overwrite if the
remote moved since your last fetch. If it is rejected, **stop and investigate**
before doing anything else.

### Branch protection
If `main` is protected (required PRs / "do not allow force pushes"), GitHub will
reject the push. Temporarily relax the rule in **Settings → Branches**, push, then
re-enable it. If **push protection / secret scanning** flags the push, note that
the values are being *removed*, not added.

---

## 8. Collaborators, forks, and GitHub caches

- Every existing clone/fork becomes history-diverged. Collaborators should
  re-sync (`git fetch origin && git checkout main && git reset --hard origin/main`)
  or, more safely, delete and re-clone. They must **not** `git pull` (a merge
  would reintroduce the old history).
- **Forks and open PRs** still reference the old commits — handle them on GitHub.
- GitHub retains unreachable objects internally for a period and may serve old
  commit SHAs by direct URL until it garbage-collects; you can ask GitHub Support
  to expedite purging after the force-push.
- Search indexes, cached pages, and third parties who already cloned may retain
  the old content. **This is why rotation (§9) is mandatory.**

---

## 9. Credential rotation (mandatory, independent of the rewrite)

The *previously exposed seed password* is compromised. Rotate the local seeded
account:

```bash
# 1) Set a NEW strong value in .env (never commit .env):
#    SEED_ADMIN_EMAIL="admin@example.com"
#    SEED_ADMIN_PASSWORD="<a-new-strong-unique-local-development-password>"

# 2) Re-seed to persist a fresh bcrypt hash:
npm run db:seed

# 3) Verify the OLD password no longer authenticates and the hash changed.
```
Do not print or commit the new password. Never reuse the old one anywhere. Also
rotate any real `AUTH_SECRET` / `JOBS_REFRESH_SECRET` / database password if a
real `.env` was ever derived from an old example.

---

## 10. Post-remediation cleanup

```bash
shred -u ../replacements.txt 2>/dev/null || rm -f ../replacements.txt
rm -f ../mailmap.txt 2>/dev/null
# Keep the bundle + mirror backups until you have confirmed the remote is clean
# and credentials are rotated; then remove them.
history -c   # clear the current shell session's history for good measure
```

---

## 11. Rollback

- **Before force-pushing:** the remote is untouched — just re-clone `origin`, or
  restore locally from `../PrinodiaCyberLab-backup-*.bundle`.
- **After force-pushing, to revert the remote:**
  ```bash
  cd ../PrinodiaCyberLab-remote-backup.git
  git push --force "$(cat ../ORIGIN_URL.txt)" 'refs/heads/*:refs/heads/*'
  ```

---

## 12. Risks summary

- Irreversible on the remote once force-pushed (mitigated by §3 backups).
- All commit SHAs change → links to commits, deploy pins, and any external
  references to old SHAs break.
- Collaborators/forks diverge.
- GitHub caches/forks may retain old content → rotation is mandatory.
- Do not run `git filter-repo`, BFG, or any force-push without a current backup
  and a clean working tree.
