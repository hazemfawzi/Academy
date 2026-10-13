#!/usr/bin/env bash
set -euo pipefail
site_dir=$1
cd "$site_dir"
[[ ! -L .htaccess ]] || { echo 'Refusing to modify a symlinked .htaccess' >&2; exit 1; }
backup_dir="${site_dir%/}.deploy-backups/cache-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
if [[ -f .htaccess ]]; then cp -p .htaccess "$backup_dir/htaccess"; fi
new_config=$(mktemp "$site_dir/.academy-htaccess.XXXXXX")
trap 'rm -f "$new_config"' EXIT
if [[ -f .htaccess ]]; then
 awk '/^# BEGIN ACADEMY CACHE$/{skip=1;next}/^# END ACADEMY CACHE$/{skip=0;next}!skip{print}' .htaccess > "$new_config"
fi
cat >> "$new_config" <<'CONFIG'

# BEGIN ACADEMY CACHE
<IfModule mod_dir.c>
  DirectoryIndex disabled
  DirectoryIndex index.html
</IfModule>
<IfModule mod_alias.c>
  RedirectMatch 302 ^/kora-gym-dashboard\.html$ /dashboard.html
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\.(html|htm)$">
    Header always set Cache-Control "no-store, no-cache, must-revalidate, max-age=0"
    Header always set Pragma "no-cache"
    Header always set Expires "0"
  </FilesMatch>
</IfModule>
<IfModule mod_expires.c>
  <FilesMatch "\.(html|htm)$">
    ExpiresActive Off
  </FilesMatch>
</IfModule>
<IfModule LiteSpeed>
  CacheDisable public /
  CacheDisable private /
</IfModule>
# END ACADEMY CACHE
CONFIG
chmod 644 "$new_config"
mv "$new_config" .htaccess
printf 'Cache configuration installed; previous settings backed up outside document root.\n'
