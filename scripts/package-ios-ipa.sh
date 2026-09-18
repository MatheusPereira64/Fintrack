#!/usr/bin/env bash
# Empacota o .app do archive Xcode no formato IPA (Payload/*.app).
set -euo pipefail

VERSION="${1:?informe a versão, ex: 1.0.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="${ROOT}/ios/build/FinTrack.xcarchive"
STAGE="${ROOT}/ios/build/ipa-stage"
DIST="${ROOT}/dist"
OUT="${DIST}/FinTrack-${VERSION}.ipa"

if [[ ! -d "$ARCHIVE" ]]; then
  echo "Archive não encontrado: $ARCHIVE" >&2
  exit 1
fi

APP="$(find "${ARCHIVE}/Products/Applications" -maxdepth 1 -name '*.app' | head -n 1)"
if [[ -z "$APP" ]]; then
  echo "Nenhum .app dentro do archive." >&2
  exit 1
fi

rm -rf "$STAGE"
mkdir -p "${STAGE}/Payload" "$DIST"
cp -R "$APP" "${STAGE}/Payload/"

# IPA = zip do diretório Payload (formato padrão da Apple / sideload).
(
  cd "$STAGE"
  zip -qry "$OUT" Payload
)

ls -lh "$OUT"
echo "IPA_PATH=$OUT"
