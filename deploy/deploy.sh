#!/usr/bin/env bash
# Deploy web AksesBogor di Evergarden (ADR-0048), dengan pola yang sama seperti deploy.sh di akses-bogor-api (ADR-0026).
#
#   deploy.sh [ref]          build ref (bawaan: $DEPLOY_REF atau release) bila berbeda dari rilis aktif, lalu pindahkan
#                            tautan current. Dijalankan sebagai aksesbogor-web.
#   deploy.sh --check [ref]  keluar 0 bila ref atau web.env berubah sejak rilis aktif dan hasilnya belum pernah gagal
#                            health check, 1 bila tidak. Dipakai ExecCondition.
#   deploy.sh --activate     restart web lalu health check; bila gagal, kembali ke rilis sebelumnya. Dijalankan sebagai
#                            root dari ExecStartPost, karena aksesbogor-web tidak boleh me-restart service.
set -euo pipefail

root=${DEPLOY_ROOT:-/srv/akses-bogor-web}
repo=$root/repo.git
env_file=${ENV_FILE:-/etc/akses-bogor/web.env}
user=aksesbogor-web
service=akses-bogor-web.service
keep=3

# Build hanya melihat web.env dan variabel di bawah ini, siapa pun yang menjalankannya. Variabel dari shell pemanggil
# bisa mengubah hasil build: misalnya penanda coding agent (CLAUDECODE dan sejenisnya) membuat Next.js 16 menghentikan
# build sekali untuk menampilkan pengingat upgrade. Dengan CI=true dan tanpa terminal, pengingat itu tidak pernah muncul.
clean_env() {
  env -i PATH=/usr/local/bin:/usr/bin:/bin HOME="$root" LANG=C.UTF-8 CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1 "$@"
}

# Web sehat bila Beranda dan robots.txt menjawab 200. Keduanya tetap 200 saat API mati, jadi gangguan API tidak memicu
# rollback web.
healthy() {
  local port=$1 attempt
  for attempt in $(seq 1 30); do
    if curl --silent --fail --output /dev/null --max-time 10 "http://127.0.0.1:$port/robots.txt" &&
      curl --silent --fail --output /dev/null --max-time 10 "http://127.0.0.1:$port/"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

as_user() {
  runuser -u "$user" -- "$@"
}

switch_current() {
  as_user ln -sfn "$1" "$root/current.new"
  as_user mv -T "$root/current.new" "$root/current"
}

activate() {
  local port target previous
  port=$(sed -n 's/^PORT=//p' "$env_file" | tail -n 1)
  : "${port:?PORT kosong di $env_file}"
  target=$(readlink "$root/current")
  systemctl restart "$service"
  if healthy "$port"; then
    echo "web sehat di port $port: $target"
    return 0
  fi
  echo "health check gagal untuk $target" >&2
  # Rilis ini tidak dicoba lagi oleh timer sampai release berisi commit lain atau web.env berubah.
  as_user mkdir -p "$root/gagal"
  as_user touch "$root/gagal/$(basename "$target")"
  previous=$(readlink "$root/previous" 2>/dev/null || true)
  if [[ -z $previous || $previous == "$target" ]]; then
    echo "tidak ada rilis sebelumnya untuk rollback" >&2
    exit 1
  fi
  switch_current "$previous"
  systemctl restart "$service"
  if healthy "$port"; then
    echo "rollback ke $previous berhasil" >&2
  else
    echo "rollback ke $previous juga gagal health check" >&2
  fi
  exit 1
}

if [[ ${1:-} == --activate ]]; then
  activate
  exit 0
fi

check=false
if [[ ${1:-} == --check ]]; then
  check=true
  shift
fi
ref=${1:-${DEPLOY_REF:-release}}

git --git-dir="$repo" fetch --quiet --prune origin '+refs/heads/*:refs/heads/*'
sha=$(git --git-dir="$repo" rev-parse --verify "$ref^{commit}")
# NEXT_PUBLIC_*, SITE_URL, dan SITE_INDEXABLE ditanam saat build, jadi satu rilis adalah pasangan commit dan isi
# web.env. Mengubah web.env berarti rilis baru, yang dibangun timer berikutnya, dan rilis lama tetap bisa jadi rollback.
env_hash=$(grep -v '^[[:space:]]*\(#\|$\)' "$env_file" | sha256sum | cut -c 1-12)
id=$sha-$env_hash
active=$(basename "$(readlink -f "$root/current" 2>/dev/null || echo none)")

# Mis. release yang belum pernah di-merge dari main. Dengan --check, unit dilewati, bukan gagal.
if ! git --git-dir="$repo" cat-file -e "$sha:package.json" 2>/dev/null; then
  echo "$ref ($sha) tidak berisi aplikasi; deploy dibatalkan" >&2
  exit 1
fi

if $check; then
  if [[ $id == "$active" ]]; then
    echo "$ref masih $sha dan web.env tidak berubah"
    exit 1
  fi
  if [[ -e $root/gagal/$id ]]; then
    echo "$ref ($sha) dengan web.env ini pernah gagal health check; menunggu commit baru atau perubahan web.env" >&2
    exit 1
  fi
  exit 0
fi

dir=$root/releases/$id
echo "deploy $ref ($sha), web.env $env_hash"
# Folder tanpa penanda .deploy-ok berasal dari deploy yang gagal di tengah jalan.
if [[ ! -e $dir/.deploy-ok ]]; then
  started=$SECONDS
  rm -rf "$dir"
  mkdir -p "$dir"
  git --git-dir="$repo" archive "$sha" | tar -x -C "$dir"
  # Tanpa NODE_ENV dari web.env, supaya devDependencies (Tailwind, TypeScript) ikut terpasang untuk build.
  (cd "$dir" && clean_env corepack pnpm install --frozen-lockfile)
  # NEXT_PUBLIC_* ditanam ke JavaScript browser saat build, jadi web.env juga dibaca di sini, bukan hanya saat runtime.
  (cd "$dir" && clean_env bash -c '
    set -a && . "$1" && set +a
    : "${API_URL:?API_URL kosong di $1}" "${SITE_URL:?SITE_URL kosong di $1}"
    exec corepack pnpm build' build "$env_file")
  touch "$dir/.deploy-ok"
  echo "build selesai dalam $((SECONDS - started)) detik"
fi

# previous dipakai --activate untuk rollback bila rilis baru gagal health check.
current=$(readlink "$root/current" 2>/dev/null || true)
if [[ -n $current && $current != "releases/$id" ]]; then
  ln -sfn "$current" "$root/previous.new"
  mv -T "$root/previous.new" "$root/previous"
fi
ln -sfn "releases/$id" "$root/current.new"
mv -T "$root/current.new" "$root/current"
echo "rilis aktif: $id"

# Simpan beberapa rilis terakhir untuk rollback. touch menjadikan rilis aktif yang terbaru, juga saat commit lama
# di-deploy ulang, supaya tidak ikut terhapus. Rilis sebelumnya tidak pernah dihapus, walaupun lebih tua dari rilis
# yang gagal health check.
touch "$dir"
previous_dir=$(readlink -f "$root/previous" 2>/dev/null || true)
ls -1dt "$root"/releases/*/ | tail -n +$((keep + 1)) | while read -r old; do
  [[ ${old%/} == "$previous_dir" ]] || rm -rf -- "$old"
done
